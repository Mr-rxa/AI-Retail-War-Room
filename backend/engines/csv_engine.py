"""
csv_engine.py
─────────────
Pure-Pandas analytics engine that mirrors every PostgreSQL repository function
used by analytics_service, dashboard_service, forecast_service, and
anomaly_service.

All public functions accept a session_id, retrieve the stored DataFrame from
session_store, and return dicts/lists with IDENTICAL structure to the
PostgreSQL repository equivalents so that ALL downstream services work
without modification.

Normalised DataFrame columns (after mapping is applied):
    order_id        – str
    order_date      – datetime64[ns]
    customer_id     – str
    payment_value   – float
    payment_type    – str  (may be "unknown" if absent)
    product_category– str  (may be "Unknown" if absent)
    item_price      – float (falls back to payment_value if absent)
    region          – str  (may be "Unknown" if absent)
    delivery_date   – datetime64[ns] or NaT
"""

from __future__ import annotations

import io
import warnings as _warnings
from datetime import datetime

import numpy as np
import pandas as pd

from backend.engines import session_store

# suppress Prophet / sklearn stdout noise when called from here
_warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────────────────────
# Helper: load + normalise DataFrame
# ─────────────────────────────────────────────────────────────────────────────

def _apply_filters(df: pd.DataFrame, filters: dict | None = None) -> pd.DataFrame:
    """Apply year / region / payment_type filters to a DataFrame without mutating original."""
    if not filters or not any(filters.values()):
        return df
    mask = pd.Series(True, index=df.index)
    if filters.get("year"):
        try:
            yr = int(filters["year"])
            mask &= (df["order_date"].dt.year == yr)
        except (ValueError, TypeError):
            pass
    if filters.get("state"):
        st = str(filters["state"]).strip()
        mask &= (df["region"].astype(str) == st)
    if filters.get("payment"):
        pm = str(filters["payment"]).strip()
        mask &= (df["payment_type"].astype(str) == pm)
    return df[mask]


def _load(session_id: str, filters: dict | None = None) -> pd.DataFrame:
    """
    Retrieve the stored DataFrame for *session_id*.
    Raises ValueError if no data is found. Zero copy overhead.
    """
    entry = session_store.get(session_id)
    if entry is None:
        raise ValueError(f"No uploaded data found for session '{session_id}'.")
    df = entry["df"]
    if filters and any(filters.values()):
        return _apply_filters(df, filters)
    return df


def build_normalised_df(raw_df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    """
    Given the raw uploaded DataFrame and a confirmed column mapping
    (logical_field → csv_column_name), return a clean normalised DataFrame
    with standard column names the engine can work with.

    Missing optional columns are filled with sensible defaults.
    Constructs norm_df column-by-column to avoid duplicate memory copying.
    """
    norm_df = pd.DataFrame(index=raw_df.index)

    # ── map and convert columns directly ───────────────────────────────────
    for logical_field, csv_col in mapping.items():
        if csv_col and csv_col in raw_df.columns:
            if logical_field in ("payment_value", "item_price"):
                norm_df[logical_field] = pd.to_numeric(raw_df[csv_col], errors="coerce").fillna(0.0).astype("float32")
            elif logical_field in ("order_date", "delivery_date"):
                norm_df[logical_field] = pd.to_datetime(raw_df[csv_col], errors="coerce")
            else:
                norm_df[logical_field] = raw_df[csv_col].astype("category") if logical_field in ("region", "payment_type", "product_category") else raw_df[csv_col].astype(str)

    # ── optional columns with defaults ──────────────────────────────────────
    if "payment_type" not in norm_df.columns:
        norm_df["payment_type"] = "unknown"

    if "product_category" not in norm_df.columns:
        norm_df["product_category"] = "Unknown"

    if "item_price" not in norm_df.columns:
        norm_df["item_price"] = norm_df["payment_value"]

    if "region" not in norm_df.columns:
        norm_df["region"] = "Unknown"

    if "delivery_date" not in norm_df.columns:
        norm_df["delivery_date"] = pd.NaT

    # ── drop invalid rows using boolean mask to avoid block consolidation ────
    valid_mask = norm_df["order_date"].notna() & (norm_df["payment_value"] > 0)
    norm_df = norm_df[valid_mask]

    # ── derived helpers ──────────────────────────────────────────────────────
    norm_df["month"]   = norm_df["order_date"].dt.to_period("M").dt.to_timestamp()
    norm_df["weekday"] = norm_df["order_date"].dt.day_name()
    norm_df["hour"]    = norm_df["order_date"].dt.hour

    return norm_df





# ─────────────────────────────────────────────────────────────────────────────
# Analytics functions — mirror of analytics_repository.py
# ─────────────────────────────────────────────────────────────────────────────

def revenue_growth(session_id: str, filters: dict | None = None) -> list[dict]:
    """Monthly revenue with MoM % growth — mirrors analytics_repository.revenue_growth()."""
    df = _load(session_id, filters=filters)
    monthly = (
        df.groupby("month", as_index=False)["payment_value"]
        .sum()
        .sort_values("month")
        .rename(columns={"payment_value": "revenue"})
    )
    monthly["revenue"] = monthly["revenue"].round(2)
    monthly["previous_revenue"] = monthly["revenue"].shift(1).round(2)
    monthly["growth_percent"] = (
        ((monthly["revenue"] - monthly["previous_revenue"]) /
         monthly["previous_revenue"].replace(0, np.nan)) * 100
    ).round(2)

    # filter to mirror the SQL WHERE month >= '2017-06-01' — keep all data
    result = []
    for _, row in monthly.iterrows():
        result.append({
            "month":            row["month"].strftime("%Y-%m-%d"),
            "revenue":          float(row["revenue"]),
            "previous_revenue": None if pd.isna(row["previous_revenue"]) else float(row["previous_revenue"]),
            "growth_percent":   None if pd.isna(row["growth_percent"])   else float(row["growth_percent"]),
        })
    return result


def monthly_revenue(session_id: str, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.monthly_revenue()"""
    df = _load(session_id, filters=filters)
    monthly = (
        df.groupby("month", as_index=False)["payment_value"]
        .sum()
        .sort_values("month")
    )
    return [
        {
            "month":   row["month"].strftime("%Y-%m-%d"),
            "revenue": round(float(row["payment_value"]), 2),
        }
        for _, row in monthly.iterrows()
    ]


def monthly_orders(session_id: str, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.monthly_orders()"""
    df = _load(session_id, filters=filters)
    monthly = (
        df.groupby("month", as_index=False)["order_id"]
        .nunique()
        .sort_values("month")
        .rename(columns={"order_id": "orders"})
    )
    return [
        {
            "month":  row["month"].strftime("%Y-%m-%d"),
            "orders": int(row["orders"]),
        }
        for _, row in monthly.iterrows()
    ]


def top_categories(session_id: str, limit: int = 10, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.top_categories()"""
    df = _load(session_id, filters=filters)

    grp = (
        df.groupby("product_category", as_index=False)
        .agg(revenue=("item_price", "sum"), orders=("order_id", "nunique"))
        .sort_values("revenue", ascending=False)
        .head(limit)
    )
    return [
        {
            "category": row["product_category"],
            "revenue":  round(float(row["revenue"]), 2),
            "orders":   int(row["orders"]),
        }
        for _, row in grp.iterrows()
    ]


def top_states(session_id: str, limit: int = 10, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.top_states() — 'region' maps to customer_state"""
    df = _load(session_id, filters=filters)
    grp = (
        df.groupby("region", as_index=False)
        .agg(revenue=("payment_value", "sum"), orders=("order_id", "nunique"))
        .sort_values("revenue", ascending=False)
        .head(limit)
    )
    return [
        {
            "customer_state": row["region"],
            "revenue":        round(float(row["revenue"]), 2),
            "orders":         int(row["orders"]),
        }
        for _, row in grp.iterrows()
    ]


def payment_breakdown(session_id: str, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.payment_breakdown()"""
    df = _load(session_id, filters=filters)
    grp = (
        df.groupby("payment_type", as_index=False)
        .agg(total=("order_id", "count"), revenue=("payment_value", "sum"))
        .sort_values("revenue", ascending=False)
    )
    return [
        {
            "payment_type": row["payment_type"],
            "total":        int(row["total"]),
            "revenue":      round(float(row["revenue"]), 2),
        }
        for _, row in grp.iterrows()
    ]


def top_products(session_id: str, limit: int = 10, filters: dict | None = None) -> list[dict]:
    """
    mirrors analytics_repository.top_products()
    Uses (order_id + category) as a proxy since we may not have product_id.
    """
    df = _load(session_id, filters=filters)
    grp = (
        df.groupby(["order_id", "product_category"], as_index=False)
        .agg(sold=("order_id", "count"), revenue=("item_price", "sum"))
        .groupby("product_category", as_index=False)
        .agg(sold=("sold", "sum"), revenue=("revenue", "sum"))
        .sort_values("revenue", ascending=False)
        .head(limit)
    )
    return [
        {
            "product":  row["product_category"][:10],
            "category": row["product_category"],
            "sold":     int(row["sold"]),
            "revenue":  round(float(row["revenue"]), 2),
        }
        for _, row in grp.iterrows()
    ]


def average_order_value(session_id: str, filters: dict | None = None) -> dict:
    """mirrors analytics_repository.average_order_value()"""
    df = _load(session_id, filters=filters)
    unique_orders = df.groupby("order_id")["payment_value"].sum()
    aov = unique_orders.mean() if not unique_orders.empty else 0.0
    return {"average_order_value": round(float(aov), 2)}


def repeat_customers(session_id: str, filters: dict | None = None) -> dict:
    """mirrors analytics_repository.repeat_customers()"""
    df = _load(session_id, filters=filters)
    order_counts = df.groupby("customer_id")["order_id"].nunique()
    count = int((order_counts > 1).sum())
    return {"repeat_customers": count}


def customer_retention(session_id: str, filters: dict | None = None) -> dict:
    """mirrors analytics_repository.customer_retention()"""
    df = _load(session_id, filters=filters)

    order_counts = df.groupby("customer_id")["order_id"].nunique()
    total    = int(len(order_counts))
    repeat   = int((order_counts > 1).sum())
    avg_ord  = round(float(order_counts.mean()), 2) if total else 0.0
    return {
        "avg_orders":       avg_ord,
        "max_orders":       int(order_counts.max()) if total else 0,
        "min_orders":       int(order_counts.min()) if total else 0,
        "repeat_customers": repeat,
        "total_customers":  total,
    }


def new_customers_monthly(session_id: str, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.new_customers_monthly()"""
    df = _load(session_id, filters=filters)
    first_order = df.groupby("customer_id")["order_date"].min().reset_index()
    first_order["month"] = first_order["order_date"].dt.to_period("M").dt.to_timestamp()
    monthly = first_order.groupby("month", as_index=False).size().rename(columns={"size": "new_customers"})
    return [
        {
            "month":         row["month"].strftime("%Y-%m-%d"),
            "new_customers": int(row["new_customers"]),
        }
        for _, row in monthly.sort_values("month").iterrows()
    ]


def revenue_by_weekday(session_id: str, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.revenue_by_weekday()"""
    df = _load(session_id, filters=filters)
    grp = (
        df.groupby("weekday", as_index=False)["payment_value"]
        .sum()
        .sort_values("payment_value", ascending=False)
        .rename(columns={"payment_value": "revenue"})
    )
    return [
        {
            "weekday": row["weekday"],
            "revenue": round(float(row["revenue"]), 2),
        }
        for _, row in grp.iterrows()
    ]


def sales_by_hour(session_id: str, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.sales_by_hour()"""
    df = _load(session_id, filters=filters)
    grp = (
        df.groupby("hour", as_index=False)["order_id"]
        .count()
        .rename(columns={"order_id": "orders"})
        .sort_values("hour")
    )
    return [
        {
            "hour":   int(row["hour"]),
            "orders": int(row["orders"]),
        }
        for _, row in grp.iterrows()
    ]


def delivery_performance(session_id: str, filters: dict | None = None) -> dict:
    """mirrors analytics_repository.delivery_performance()"""
    df = _load(session_id, filters=filters)
    if df["delivery_date"].isna().all():
        # No delivery dates → return a neutral value
        return {"avg_delivery_days": 7.0}

    delivered = df.dropna(subset=["delivery_date"]).copy()
    delivered["delivery_days"] = (
        delivered["delivery_date"] - delivered["order_date"]
    ).dt.days
    avg = delivered["delivery_days"].clip(lower=0).mean()
    return {"avg_delivery_days": round(float(avg) if not pd.isna(avg) else 7.0, 2)}


def repeat_vs_new_customers_monthly(session_id: str, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.repeat_vs_new_customers_monthly()"""
    df = _load(session_id, filters=filters)
    first_month = (
        df.groupby("customer_id")["order_date"]
        .min()
        .dt.to_period("M")
        .dt.to_timestamp()
        .rename("first_month")
        .reset_index()
    )
    merged = df.merge(first_month, on="customer_id")
    merged["month"] = merged["order_date"].dt.to_period("M").dt.to_timestamp()

    cust_months = merged[["customer_id", "month", "first_month"]].drop_duplicates()
    cust_months["is_new"] = (cust_months["month"] == cust_months["first_month"]).astype(int)
    cust_months["is_repeat"] = (cust_months["month"] > cust_months["first_month"]).astype(int)

    monthly_agg = cust_months.groupby("month", as_index=False).agg(
        new_customers=("is_new", "sum"),
        repeat_customers=("is_repeat", "sum"),
        total_customers=("customer_id", "count")
    ).sort_values("month")

    return [
        {
            "month":            row["month"].strftime("%Y-%m-%d"),
            "new_customers":    int(row["new_customers"]),
            "repeat_customers": int(row["repeat_customers"]),
            "total_customers":  int(row["total_customers"]),
        }
        for _, row in monthly_agg.iterrows()
    ]


def customer_segments(session_id: str, filters: dict | None = None) -> list[dict]:
    """
    RFM-based segmentation — mirrors analytics_repository.customer_segments()
    Vectorized implementation for ultra-fast processing on large CSVs.
    """
    df = _load(session_id, filters=filters)
    if df.empty:
        return []

    max_date = df["order_date"].max()

    stats = (
        df.groupby("customer_id")
        .agg(
            total_orders   = ("order_id",        "nunique"),
            total_revenue  = ("payment_value",   "sum"),
            last_purchase  = ("order_date",       "max"),
            customer_state = ("region",           "first"),
        )
        .reset_index()
    )
    stats["recency_days"] = (max_date - stats["last_purchase"]).dt.days.clip(lower=0)

    conditions = [
        stats["recency_days"] >= 180,
        stats["recency_days"] >= 120,
        (stats["total_revenue"] >= 1000) | (stats["total_orders"] >= 5)
    ]
    choices = ["Inactive", "At Risk", "High Value"]
    stats["segment"] = np.select(conditions, choices, default="Regular")

    seg_order = {"High Value": 1, "Regular": 2, "At Risk": 3, "Inactive": 4}
    summary = (
        stats.groupby("segment", as_index=False)
        .agg(
            customers          = ("customer_id",    "count"),
            revenue            = ("total_revenue",  "sum"),
            average_orders     = ("total_orders",   "mean"),
            average_recency_days = ("recency_days", "mean"),
        )
    )
    summary["sort_key"] = summary["segment"].map(seg_order)
    summary = summary.sort_values("sort_key").drop(columns="sort_key")

    return [
        {
            "segment":              row["segment"],
            "customers":            int(row["customers"]),
            "revenue":              round(float(row["revenue"]), 2),
            "average_orders":       round(float(row["average_orders"]), 2),
            "average_recency_days": round(float(row["average_recency_days"]), 0),
        }
        for _, row in summary.iterrows()
    ]


def average_days_between_orders(session_id: str, filters: dict | None = None) -> dict:
    """mirrors analytics_repository.average_days_between_orders() — vectorized for high speed"""
    df = _load(session_id, filters=filters)
    if df.empty:
        return {"avg_days_between_orders": 0.0}

    sub = df[["customer_id", "order_date"]].dropna().drop_duplicates().sort_values(["customer_id", "order_date"])
    same_customer = sub["customer_id"] == sub["customer_id"].shift(1)
    diff_days = (sub["order_date"] - sub["order_date"].shift(1)).dt.days[same_customer]
    positive_gaps = diff_days[diff_days > 0]

    avg = round(float(positive_gaps.mean()), 2) if not positive_gaps.empty else 0.0
    return {"avg_days_between_orders": avg}




def risky_customer_regions(session_id: str, limit: int = 8, filters: dict | None = None) -> list[dict]:
    """mirrors analytics_repository.risky_customer_regions()"""
    df = _load(session_id, filters=filters)
    max_date = df["order_date"].max()
    stats = (
        df.groupby("customer_id")
        .agg(
            region        = ("region",        "first"),
            total_orders  = ("order_id",      "nunique"),
            total_revenue = ("payment_value", "sum"),
            last_purchase = ("order_date",    "max"),
        )
        .reset_index()
    )
    stats["recency_days"] = (max_date - stats["last_purchase"]).dt.days.clip(lower=0)
    stats["risky"] = stats["recency_days"] >= 120

    region_grp = (
        stats.groupby("region")
        .agg(
            customers       = ("customer_id",  "count"),
            risky_customers = ("risky",        "sum"),
            total_revenue   = ("total_revenue", "sum"),
        )
        .reset_index()
    )
    region_grp["risk_rate"] = (
        region_grp["risky_customers"] / region_grp["customers"].replace(0, np.nan) * 100
    ).round(2)
    region_grp = region_grp.sort_values("risk_rate", ascending=False).head(limit)

    return [
        {
            "customer_state": row["region"],
            "customers":      int(row["customers"]),
            "risky_customers": int(row["risky_customers"]),
            "risk_rate":      float(row["risk_rate"]) if not pd.isna(row["risk_rate"]) else 0.0,
            "revenue":        round(float(row["total_revenue"]), 2),
        }
        for _, row in region_grp.iterrows()
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard functions — mirror of dashboard_repository.py
# (uses the _apply_filters helper defined at top of module)
# ─────────────────────────────────────────────────────────────────────────────


def fetch_kpis(session_id: str, filters: dict) -> dict:
    """mirrors dashboard_repository.fetch_kpis()"""
    df = _apply_filters(_load(session_id), filters)
    revenue = round(float(df["payment_value"].sum()), 2)
    orders  = int(df["order_id"].nunique())
    aov     = round(revenue / orders, 2) if orders else 0.0
    customers = int(df["customer_id"].nunique())
    return {
        "revenue":             revenue,
        "orders":              orders,
        "average_order_value": aov,
        "customers":           customers,
    }


def fetch_monthly_sales(session_id: str, filters: dict) -> list[dict]:
    """mirrors dashboard_repository.fetch_monthly_sales()"""
    df = _apply_filters(_load(session_id), filters)
    df["_month_str"] = df["order_date"].dt.to_period("M").dt.strftime("%Y-%m")
    grp = (
        df.groupby("_month_str", as_index=False)["payment_value"]
        .sum()
        .sort_values("_month_str")
    )
    return [
        {"month": row["_month_str"], "revenue": round(float(row["payment_value"]), 2)}
        for _, row in grp.iterrows()
    ]


def fetch_top_categories(session_id: str, filters: dict) -> list[dict]:
    """mirrors dashboard_repository.fetch_top_categories()"""
    df = _apply_filters(_load(session_id), filters)
    grp = (
        df.groupby("product_category", as_index=False)
        .agg(revenue=("item_price", "sum"), orders=("order_id", "nunique"))
        .sort_values("revenue", ascending=False)
        .head(10)
    )
    return [
        {
            "category": row["product_category"],
            "revenue":  round(float(row["revenue"]), 2),
            "orders":   int(row["orders"]),
        }
        for _, row in grp.iterrows()
    ]


def fetch_payment_types(session_id: str, filters: dict) -> list[dict]:
    """mirrors dashboard_repository.fetch_payment_types()"""
    df = _apply_filters(_load(session_id), filters)
    grp = (
        df.groupby("payment_type", as_index=False)
        .agg(total=("order_id", "count"), revenue=("payment_value", "sum"))
        .sort_values("total", ascending=False)
    )
    return [
        {
            "payment_type": row["payment_type"],
            "total":        int(row["total"]),
            "revenue":      round(float(row["revenue"]), 2),
        }
        for _, row in grp.iterrows()
    ]


def fetch_state_sales(session_id: str, filters: dict) -> list[dict]:
    """mirrors dashboard_repository.fetch_state_sales()"""
    df = _apply_filters(_load(session_id), filters)
    grp = (
        df.groupby("region", as_index=False)
        .agg(revenue=("payment_value", "sum"), orders=("order_id", "nunique"))
        .sort_values("revenue", ascending=False)
    )
    return [
        {
            "customer_state": row["region"],
            "revenue":        round(float(row["revenue"]), 2),
            "orders":         int(row["orders"]),
        }
        for _, row in grp.iterrows()
    ]


def fetch_filter_options(session_id: str) -> dict:
    """mirrors dashboard_repository.fetch_filter_options()"""
    df = _load(session_id)
    years = sorted(df["order_date"].dt.year.dropna().unique().tolist())
    state_grp = (
        df.groupby("region", as_index=False)["order_id"]
        .nunique()
        .sort_values("order_id", ascending=False)
        .rename(columns={"region": "customer_state", "order_id": "orders"})
    )
    pay_grp = (
        df.groupby("payment_type", as_index=False)["order_id"]
        .count()
        .sort_values("order_id", ascending=False)
        .rename(columns={"order_id": "total"})
    )
    return {
        "years":    [{"year": int(y)} for y in years],
        "states":   state_grp.to_dict(orient="records"),
        "payments": pay_grp.to_dict(orient="records"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Forecast history — mirror of forecast_repository.sales_history()
# ─────────────────────────────────────────────────────────────────────────────

def sales_history(session_id: str, filters: dict | None = None) -> list[dict]:
    """
    Daily revenue series in Prophet format { ds, y }.
    mirrors forecast_repository.sales_history()
    """
    df = _load(session_id, filters=filters)

    daily = (
        df.groupby(df["order_date"].dt.date, as_index=False)["payment_value"]
        .sum()
        .rename(columns={"order_date": "ds", "payment_value": "y"})
    )
    daily["ds"] = pd.to_datetime(daily["ds"])
    daily = daily.sort_values("ds")
    return [
        {"ds": row["ds"].strftime("%Y-%m-%d"), "y": round(float(row["y"]), 2)}
        for _, row in daily.iterrows()
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Composite: full analytics bundle (mirrors analytics_service internals)
# ─────────────────────────────────────────────────────────────────────────────

def compute_analytics(session_id: str, filters: dict | None = None) -> dict:
    """
    Compute the full analytics bundle using the CSV engine.
    Returns a dict with exactly the same keys as the PostgreSQL analytics path
    so that all downstream services (business_health, insights, etc.) work unchanged.
    """
    return {
        "revenue_growth":        revenue_growth(session_id, filters=filters),
        "monthly_revenue":       monthly_revenue(session_id, filters=filters),
        "monthly_orders":        monthly_orders(session_id, filters=filters),
        "average_order_value":   average_order_value(session_id, filters=filters),
        "top_categories":        top_categories(session_id, filters=filters),
        "top_states":            top_states(session_id, filters=filters),
        "top_products":          top_products(session_id, filters=filters),
        "payment_breakdown":     payment_breakdown(session_id, filters=filters),
        "repeat_customers":      repeat_customers(session_id, filters=filters),
        "customer_retention":    customer_retention(session_id, filters=filters),
        "new_customers":         new_customers_monthly(session_id, filters=filters),
        "weekday_revenue":       revenue_by_weekday(session_id, filters=filters),
        "sales_by_hour":         sales_by_hour(session_id, filters=filters),
        "delivery_performance":  delivery_performance(session_id, filters=filters),
        # customer intelligence extras
        "repeat_vs_new":         repeat_vs_new_customers_monthly(session_id, filters=filters),
        "customer_segments":     customer_segments(session_id, filters=filters),
        "avg_days_between_orders": average_days_between_orders(session_id, filters=filters),
        "risky_regions":         risky_customer_regions(session_id, filters=filters),
        # forecast history (passed to forecast_service)
        "forecast_history":      sales_history(session_id, filters=filters),
    }

