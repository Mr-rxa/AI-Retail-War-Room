"""
csv_validator.py
────────────────
Validates an uploaded CSV file and auto-detects column mappings.

Fuzzy matching maps user column names → logical field names that
the CSV engine expects, so users don't need to name columns exactly.
"""

import io
import os

import pandas as pd
try:
    from rapidfuzz import process, fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    HAS_RAPIDFUZZ = False


# ── constants ────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB = 100
MAX_ROWS         = 2_000_000
PREVIEW_ROWS     = 5



ALLOWED_EXTENSIONS = {".csv", ".txt"}

# ── logical field definitions ────────────────────────────────────────────────
# Each logical field has a list of common alternative names used in the wild.
LOGICAL_FIELDS = {
    # ── mandatory ──────────────────────────────────────────────────────────
    "order_id": {
        "required":  True,
        "label":     "Order ID",
        "aliases":   [
            "order_id", "orderid", "order id", "order no", "order_no",
            "orderno", "transaction_id", "txn_id", "invoice_id",
            "invoice no", "sale_id", "bill_no"
        ],
    },
    "order_date": {
        "required":  True,
        "label":     "Order Date",
        "aliases":   [
            "order_date", "orderdate", "order date", "purchase_date",
            "purchase date", "order_timestamp", "created_at",
            "transaction_date", "invoice_date", "sale_date",
            "date", "order placed", "placed_at"
        ],
    },
    "customer_id": {
        "required":  True,
        "label":     "Customer ID",
        "aliases":   [
            "customer_id", "customerid", "customer id", "client_id",
            "client id", "buyer_id", "user_id", "account_id",
            "member_id", "cust_id"
        ],
    },
    "payment_value": {
        "required":  True,
        "label":     "Payment / Revenue Amount",
        "aliases":   [
            "payment_value", "payment value", "amount", "total",
            "total_amount", "order_total", "order total",
            "revenue", "sale_amount", "price_paid",
            "net_amount", "gross_amount", "invoice_amount",
            "transaction_amount", "value"
        ],
    },
    # ── optional ───────────────────────────────────────────────────────────
    "payment_type": {
        "required":  False,
        "label":     "Payment Method / Type",
        "aliases":   [
            "payment_type", "payment type", "payment_method",
            "payment method", "pay_type", "method", "mode",
            "payment mode", "transaction_type"
        ],
    },
    "product_category": {
        "required":  False,
        "label":     "Product Category",
        "aliases":   [
            "product_category", "category", "product category",
            "item_category", "dept", "department", "product_type",
            "item_type", "product type", "segment", "sub_category"
        ],
    },
    "item_price": {
        "required":  False,
        "label":     "Item Price (before shipping)",
        "aliases":   [
            "item_price", "item price", "unit_price", "unit price",
            "price", "product_price", "selling_price", "mrp",
            "list_price", "base_price"
        ],
    },
    "region": {
        "required":  False,
        "label":     "Region / State / City",
        "aliases":   [
            "region", "state", "city", "customer_state", "customer state",
            "location", "area", "zone", "territory", "district",
            "province", "geo", "geography"
        ],
    },
    "delivery_date": {
        "required":  False,
        "label":     "Delivery Date (optional)",
        "aliases":   [
            "delivery_date", "delivered_date", "delivery date",
            "delivered at", "ship_date", "shipped_date",
            "fulfillment_date", "arrival_date", "received_date"
        ],
    },
}

REQUIRED_FIELDS = [k for k, v in LOGICAL_FIELDS.items() if v["required"]]


# ─────────────────────────────────────────────────────────────────────────────
# File-level validation
# ─────────────────────────────────────────────────────────────────────────────

def _seek_start(file_storage):
    try:
        file_storage.seek(0)
    except Exception:
        try:
            if hasattr(file_storage, "stream"):
                file_storage.stream.seek(0)
        except Exception:
            pass

def _get_file_size_mb(file_storage) -> float:
    try:
        if getattr(file_storage, "content_length", None):
            return float(file_storage.content_length) / (1024 * 1024)
        stream = getattr(file_storage, "stream", file_storage)
        if hasattr(stream, "seek") and hasattr(stream, "tell"):
            stream.seek(0, os.SEEK_END)
            size = stream.tell()
            stream.seek(0)
            return size / (1024 * 1024)
    except Exception:
        pass
    _seek_start(file_storage)
    return 0.0

def validate_file(file_storage) -> dict:
    """
    Validate an uploaded FileStorage object using streaming to handle 100MB+ files with low memory footprint.

    Returns
    -------
    dict  with keys: valid (bool), error (str | None), warnings (list[str])
    """
    warnings = []

    # extension
    _, ext = os.path.splitext(file_storage.filename or "")
    if ext.lower() not in ALLOWED_EXTENSIONS:
        return {
            "valid":    False,
            "error":    f"Only CSV files are accepted. Got: '{ext}'",
            "warnings": [],
        }

    size_mb = _get_file_size_mb(file_storage)
    if size_mb > MAX_FILE_SIZE_MB:
        return {
            "valid":    False,
            "error":    f"File is {size_mb:.1f} MB. Maximum allowed is {MAX_FILE_SIZE_MB} MB.",
            "warnings": [],
        }

    # parseable? test with 5 rows
    try:
        stream = getattr(file_storage, "stream", file_storage)
        df = pd.read_csv(stream, nrows=5)
        _seek_start(file_storage)
    except Exception as exc:
        _seek_start(file_storage)
        return {
            "valid":    False,
            "error":    f"Could not parse CSV: {exc}",
            "warnings": [],
        }

    if df.empty or len(df.columns) < 2:
        return {
            "valid":    False,
            "error":    "CSV appears empty or has fewer than 2 columns.",
            "warnings": [],
        }

    if size_mb > 20:
        warnings.append(f"Large file ({size_mb:.1f} MB). Processing may take a moment.")

    return {
        "valid":    True,
        "error":    None,
        "warnings": warnings,
        "size_mb":  size_mb,
    }



# ─────────────────────────────────────────────────────────────────────────────
# Column auto-detection
# ─────────────────────────────────────────────────────────────────────────────

def _best_match(col_name: str, all_aliases: list[str], threshold: int = 70) -> str | None:
    """
    Fuzzy-match *col_name* against *all_aliases*.
    Returns the best match string if score ≥ threshold, else None.
    """
    result = process.extractOne(
        col_name.lower().strip(),
        all_aliases,
        scorer=fuzz.token_sort_ratio,
    )
    if result and result[1] >= threshold:
        return result[0]
    return None


def detect_columns(csv_columns: list[str]) -> dict:
    """
    Given a list of column names from the uploaded CSV, return a mapping:
        { logical_field: detected_csv_column | None }

    Uses fuzzy matching; confidence scores are included for UI display.
    """
    csv_lower = {c: c.lower().strip() for c in csv_columns}
    detected  = {}
    used_cols = set()   # each CSV column can only map to one logical field

    for field, meta in LOGICAL_FIELDS.items():
        best_col      = None
        best_score    = 0

        for csv_col, csv_col_lower in csv_lower.items():
            if csv_col in used_cols:
                continue
            # exact match first
            if csv_col_lower in [a.lower() for a in meta["aliases"]]:
                best_col   = csv_col
                best_score = 100
                break
            # fuzzy
            if HAS_RAPIDFUZZ:
                res = process.extractOne(
                    csv_col_lower,
                    [a.lower() for a in meta["aliases"]],
                    scorer=fuzz.token_sort_ratio,
                )
                score = res[1] if res else 0
            else:
                matches = difflib.get_close_matches(csv_col_lower, [a.lower() for a in meta["aliases"]], n=1, cutoff=0.6)
                if matches:
                    ratio = difflib.SequenceMatcher(None, csv_col_lower, matches[0]).ratio()
                    score = int(ratio * 100)
                else:
                    score = 0

            if score > best_score:
                best_col   = csv_col
                best_score = score


        if best_col and best_score >= 65:
            detected[field] = {
                "csv_column": best_col,
                "confidence": best_score,
                "auto":       True,
            }
            used_cols.add(best_col)
        else:
            detected[field] = {
                "csv_column": None,
                "confidence": 0,
                "auto":       False,
            }

    return detected


# ─────────────────────────────────────────────────────────────────────────────
# Full validation + detection pipeline
# ─────────────────────────────────────────────────────────────────────────────

def analyse_upload(file_storage) -> dict:
    """
    Main entry point called by the upload controller.

    Returns a rich dict consumed by the frontend:
    {
        "valid":            bool,
        "error":            str | None,
        "warnings":         list[str],
        "filename":         str,
        "columns":          list[str],         # original CSV headers
        "detected_mapping": dict,              # logical → {csv_column, confidence, auto}
        "missing_required": list[str],         # logical fields with no match
        "preview":          list[dict],        # first PREVIEW_ROWS rows as records
        "stats": {
            "rows":         int,
            "size_mb":      float,
            "date_range":   str | None,
            "sample_revenue": float | None,
        }
    }
    """
    file_result = validate_file(file_storage)
    if not file_result["valid"]:
        return {
            "valid":    False,
            "error":    file_result["error"],
            "warnings": file_result.get("warnings", []),
        }

    size_mb  = file_result.get("size_mb", 0.0)
    warnings = file_result["warnings"]
    filename = file_storage.filename or "upload.csv"

    # ── parse sample for fast auto-detection and validation ─────────────
    try:
        _seek_start(file_storage)
        stream = getattr(file_storage, "stream", file_storage)
        # Read sample of 10,000 rows as string for lightning-fast analysis
        df_sample = pd.read_csv(stream, nrows=10000, dtype=str)
        _seek_start(file_storage)
    except Exception as exc:
        _seek_start(file_storage)
        return {"valid": False, "error": str(exc), "warnings": warnings}

    csv_columns = list(df_sample.columns)
    detected    = detect_columns(csv_columns)

    missing_required = [
        f for f in REQUIRED_FIELDS
        if detected.get(f, {}).get("csv_column") is None
    ]

    # ── preview ─────────────────────────────────────────────────────────────
    preview = df_sample.head(PREVIEW_ROWS).fillna("").to_dict(orient="records")

    # ── quick stats ─────────────────────────────────────────────────────────
    date_range     = None
    sample_revenue = None

    date_col = detected.get("order_date", {}).get("csv_column")
    if date_col:
        try:
            dates = pd.to_datetime(df_sample[date_col], errors="coerce").dropna()
            if not dates.empty:
                date_range = f"{dates.min().strftime('%Y-%m-%d')} → {dates.max().strftime('%Y-%m-%d')}"
        except Exception:
            pass

    rev_col = detected.get("payment_value", {}).get("csv_column")
    if rev_col:
        try:
            sample_revenue = float(
                pd.to_numeric(df_sample[rev_col], errors="coerce").dropna().sum()
            )
        except Exception:
            pass

    # Estimate row count from file size and sample line length if large
    if size_mb > 10:
        sample_bytes = sum(len(line) for line in df_sample.head(100).to_csv(index=False).splitlines()) / 100.0
        est_rows = int((size_mb * 1024 * 1024) / max(sample_bytes, 10.0))
        estimated_rows = min(est_rows, MAX_ROWS)
    else:
        try:
            _seek_start(file_storage)
            df_full = pd.read_csv(getattr(file_storage, "stream", file_storage), usecols=[0], dtype=str)
            estimated_rows = len(df_full)
            _seek_start(file_storage)
        except Exception:
            estimated_rows = len(df_sample)

    stats = {
        "rows":           estimated_rows,
        "size_mb":        round(size_mb, 2),
        "date_range":     date_range,
        "sample_revenue": round(sample_revenue, 2) if sample_revenue else None,
    }



    # warn about missing optional fields
    optional_missing = [
        LOGICAL_FIELDS[f]["label"]
        for f in LOGICAL_FIELDS
        if not LOGICAL_FIELDS[f]["required"]
        and detected.get(f, {}).get("csv_column") is None
    ]
    if optional_missing:
        warnings.append(
            f"These optional fields were not detected and will be skipped: "
            + ", ".join(optional_missing)
        )

    return {
        "valid":            True,
        "error":            None,
        "warnings":         warnings,
        "filename":         filename,
        "columns":          csv_columns,
        "detected_mapping": detected,
        "missing_required": missing_required,
        "field_definitions": {
            k: {
                "label":    v["label"],
                "required": v["required"],
            }
            for k, v in LOGICAL_FIELDS.items()
        },
        "preview":          preview,
        "stats":            stats,
    }
