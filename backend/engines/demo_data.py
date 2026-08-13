"""
demo_data.py
────────────
Rich, realistic fallback retail dataset (Olist Brazilian e-commerce metrics)
used when PostgreSQL database is unconfigured/offline and no CSV has been uploaded yet.
Ensures the app NEVER fails with 500 errors and always renders a complete dashboard.
"""

def get_demo_analytics():
    return {
        "revenue_growth": [
            {"month": "2017-06-01", "revenue": 435200.50, "previous_revenue": 380100.00, "growth_percent": 14.50},
            {"month": "2017-07-01", "revenue": 492100.00, "previous_revenue": 435200.50, "growth_percent": 13.07},
            {"month": "2017-08-01", "revenue": 564300.20, "previous_revenue": 492100.00, "growth_percent": 14.67},
            {"month": "2017-09-01", "revenue": 612400.80, "previous_revenue": 564300.20, "growth_percent": 8.52},
            {"month": "2017-10-01", "revenue": 689100.40, "previous_revenue": 612400.80, "growth_percent": 12.52},
            {"month": "2017-11-01", "revenue": 820400.00, "previous_revenue": 689100.40, "growth_percent": 19.05},
            {"month": "2017-12-01", "revenue": 745800.60, "previous_revenue": 820400.00, "growth_percent": -9.09},
            {"month": "2018-01-01", "revenue": 810200.30, "previous_revenue": 745800.60, "growth_percent": 8.63},
            {"month": "2018-02-01", "revenue": 875400.10, "previous_revenue": 810200.30, "growth_percent": 8.05},
            {"month": "2018-03-01", "revenue": 942100.70, "previous_revenue": 875400.10, "growth_percent": 7.62},
            {"month": "2018-04-01", "revenue": 998400.00, "previous_revenue": 942100.70, "growth_percent": 5.98},
            {"month": "2018-05-01", "revenue": 1054300.50, "previous_revenue": 998400.00, "growth_percent": 5.60}
        ],
        "monthly_revenue": [
            {"month": "2017-06-01", "revenue": 435200.50},
            {"month": "2017-07-01", "revenue": 492100.00},
            {"month": "2017-08-01", "revenue": 564300.20},
            {"month": "2017-09-01", "revenue": 612400.80},
            {"month": "2017-10-01", "revenue": 689100.40},
            {"month": "2017-11-01", "revenue": 820400.00},
            {"month": "2017-12-01", "revenue": 745800.60},
            {"month": "2018-01-01", "revenue": 810200.30},
            {"month": "2018-02-01", "revenue": 875400.10},
            {"month": "2018-03-01", "revenue": 942100.70},
            {"month": "2018-04-01", "revenue": 998400.00},
            {"month": "2018-05-01", "revenue": 1054300.50}
        ],
        "monthly_orders": [
            {"month": "2017-06-01", "orders": 3120},
            {"month": "2017-07-01", "orders": 3450},
            {"month": "2017-08-01", "orders": 4010},
            {"month": "2017-09-01", "orders": 4320},
            {"month": "2017-10-01", "orders": 4890},
            {"month": "2017-11-01", "orders": 5820},
            {"month": "2017-12-01", "orders": 5210},
            {"month": "2018-01-01", "orders": 5640},
            {"month": "2018-02-01", "orders": 6100},
            {"month": "2018-03-01", "orders": 6520},
            {"month": "2018-04-01", "orders": 6890},
            {"month": "2018-05-01", "orders": 7240}
        ],
        "average_order_value": {"average_order_value": 154.30},
        "top_categories": [
            {"category": "health_beauty", "revenue": 1258400.50, "orders": 8920},
            {"category": "watches_gifts", "revenue": 1205300.00, "orders": 5620},
            {"category": "bed_bath_table", "revenue": 1036900.20, "orders": 9410},
            {"category": "sports_leisure", "revenue": 985200.40, "orders": 7530},
            {"category": "computers_accessories", "revenue": 912400.00, "orders": 6210},
            {"category": "furniture_decor", "revenue": 724100.80, "orders": 5340},
            {"category": "housewares", "revenue": 632500.00, "orders": 4980},
            {"category": "auto", "revenue": 591200.30, "orders": 3890}
        ],
        "top_states": [
            {"customer_state": "SP", "revenue": 3845000.00, "orders": 28450},
            {"customer_state": "RJ", "revenue": 1720000.00, "orders": 12300},
            {"customer_state": "MG", "revenue": 1450000.00, "orders": 10500},
            {"customer_state": "RS", "revenue": 780000.00, "orders": 5400},
            {"customer_state": "PR", "revenue": 690000.00, "orders": 4800}
        ],
        "top_products": [
            {"product": "HB-9901", "category": "health_beauty", "sold": 1240, "revenue": 185400.00},
            {"product": "WG-4412", "category": "watches_gifts", "sold": 890, "revenue": 164200.00},
            {"product": "BB-1020", "category": "bed_bath_table", "sold": 1560, "revenue": 142100.00}
        ],
        "payment_breakdown": [
            {"payment_type": "credit_card", "total": 45200, "revenue": 6890000.00},
            {"payment_type": "boleto", "total": 12400, "revenue": 1850000.00},
            {"payment_type": "voucher", "total": 3800, "revenue": 420000.00},
            {"payment_type": "debit_card", "total": 1900, "revenue": 210000.00}
        ],
        "repeat_customers": {"repeat_customers": 3420},
        "customer_retention": {
            "avg_orders": 1.24,
            "max_orders": 14,
            "min_orders": 1,
            "repeat_customers": 3420,
            "total_customers": 63200
        },
        "new_customers": [
            {"month": "2017-06-01", "new_customers": 2980},
            {"month": "2017-07-01", "new_customers": 3310},
            {"month": "2017-08-01", "new_customers": 3850},
            {"month": "2017-09-01", "new_customers": 4120},
            {"month": "2017-10-01", "new_customers": 4680},
            {"month": "2017-11-01", "new_customers": 5540},
            {"month": "2017-12-01", "new_customers": 4980},
            {"month": "2018-01-01", "new_customers": 5410},
            {"month": "2018-02-01", "new_customers": 5890},
            {"month": "2018-03-01", "new_customers": 6250},
            {"month": "2018-04-01", "new_customers": 6580},
            {"month": "2018-05-01", "new_customers": 6920}
        ],
        "weekday_revenue": [
            {"weekday": "Monday", "revenue": 1540000.00},
            {"weekday": "Tuesday", "revenue": 1490000.00},
            {"weekday": "Wednesday", "revenue": 1480000.00},
            {"weekday": "Thursday", "revenue": 1420000.00},
            {"weekday": "Friday", "revenue": 1380000.00},
            {"weekday": "Sunday", "revenue": 1100000.00},
            {"weekday": "Saturday", "revenue": 960000.00}
        ],
        "sales_by_hour": [
            {"hour": h, "orders": 150 + (h * 40 if h < 14 else (24 - h) * 45)} for h in range(24)
        ],
        "delivery_performance": {"avg_delivery_days": 8.5},
        "repeat_vs_new": [
            {"month": "2017-12-01", "new_customers": 4980, "repeat_customers": 230, "total_customers": 5210},
            {"month": "2018-01-01", "new_customers": 5410, "repeat_customers": 230, "total_customers": 5640},
            {"month": "2018-02-01", "new_customers": 5890, "repeat_customers": 210, "total_customers": 6100},
            {"month": "2018-03-01", "new_customers": 6250, "repeat_customers": 270, "total_customers": 6520},
            {"month": "2018-04-01", "new_customers": 6580, "repeat_customers": 310, "total_customers": 6890},
            {"month": "2018-05-01", "new_customers": 6920, "repeat_customers": 320, "total_customers": 7240}
        ],
        "customer_segments": [
            {"segment": "High Value", "customers": 6320, "revenue": 3175000.00, "average_orders": 3.4, "average_recency_days": 25},
            {"segment": "Regular", "customers": 34760, "revenue": 5210000.00, "average_orders": 1.2, "average_recency_days": 45},
            {"segment": "At Risk", "customers": 12640, "revenue": 1420000.00, "average_orders": 1.1, "average_recency_days": 135},
            {"segment": "Inactive", "customers": 9480, "revenue": 738000.00, "average_orders": 1.0, "average_recency_days": 210}
        ],
        "avg_days_between_orders": {"avg_days_between_orders": 42.5},
        "risky_regions": [
            {"customer_state": "RJ", "customers": 12300, "risky_customers": 2950, "risk_rate": 23.98, "revenue": 1720000.00},
            {"customer_state": "MG", "customers": 10500, "risky_customers": 2310, "risk_rate": 22.00, "revenue": 1450000.00},
            {"customer_state": "BA", "customers": 3800, "risky_customers": 980, "risk_rate": 25.79, "revenue": 510000.00},
            {"customer_state": "SP", "customers": 28450, "risky_customers": 4830, "risk_rate": 16.98, "revenue": 3845000.00}
        ],
        "forecast_history": [
            {"ds": f"2018-05-{d:02d}", "y": 32000 + (d * 400)} for d in range(1, 31)
        ]
    }



import copy

def filter_demo_analytics(data, filters=None):
    # Always operate on a deep copy so reset can NEVER return mutated/corrupted data
    filtered = copy.deepcopy(data)
    if not filters or not any(filters.values()):
        return filtered

    yr = str(filters.get("year", "")).strip()
    st = str(filters.get("state", "")).strip().upper()
    pm = str(filters.get("payment", "")).strip().lower()

    # 1. Year Filtering
    if yr:
        matching_rev = [m for m in filtered["monthly_revenue"] if m["month"].startswith(yr)]
        matching_ord = [m for m in filtered["monthly_orders"] if m["month"].startswith(yr)]
        if matching_rev:
            filtered["monthly_revenue"] = matching_rev
        if matching_ord:
            filtered["monthly_orders"] = matching_ord

    # 2. Multiplier for State & Payment Slicing
    state_weights = {"SP": 0.40, "RJ": 0.20, "MG": 0.15, "RS": 0.12, "PR": 0.13}
    state_mult = state_weights.get(st, 0.10) if st else 1.0

    pay_weights = {"credit_card": 0.70, "boleto": 0.20, "voucher": 0.06, "debit_card": 0.04}
    pay_mult = pay_weights.get(pm, 0.15) if pm else 1.0

    mult = state_mult * pay_mult

    # 3. Apply proportional scaling to monthly revenue & orders
    filtered["monthly_revenue"] = [
        {**m, "revenue": round(m["revenue"] * mult, 2)} for m in filtered["monthly_revenue"]
    ]
    filtered["monthly_orders"] = [
        {**m, "orders": max(1, int(m["orders"] * mult))} for m in filtered["monthly_orders"]
    ]

    # Calculate new filtered totals
    tot_rev = sum(m["revenue"] for m in filtered["monthly_revenue"])
    tot_ord = sum(m["orders"] for m in filtered["monthly_orders"])

    # 4. State Filtering
    if st:
        existing_states = [s for s in filtered["top_states"] if s["customer_state"] == st]
        if existing_states:
            filtered["top_states"] = [
                {**s, "revenue": round(s["revenue"] * pay_mult, 2), "orders": max(1, int(s["orders"] * pay_mult))}
                for s in existing_states
            ]
        else:
            filtered["top_states"] = [{"customer_state": st, "revenue": round(tot_rev, 2), "orders": tot_ord}]

    # 5. Payment Filtering
    if pm:
        existing_pay = [p for p in filtered["payment_breakdown"] if p["payment_type"] == pm]
        if existing_pay:
            filtered["payment_breakdown"] = [
                {**p, "revenue": round(p["revenue"] * state_mult, 2), "total": max(1, int(p["total"] * state_mult))}
                for p in existing_pay
            ]
        else:
            filtered["payment_breakdown"] = [{"payment_type": pm, "total": tot_ord, "revenue": round(tot_rev, 2)}]

    return filtered


def get_demo_dashboard(filters=None):
    raw_demo = get_demo_analytics()
    analytics = filter_demo_analytics(raw_demo, filters)

    tot_rev = sum(m["revenue"] for m in analytics["monthly_revenue"])
    tot_ord = sum(m["orders"] for m in analytics["monthly_orders"])
    aov = round(tot_rev / tot_ord, 2) if tot_ord > 0 else 145.62
    cust = int(tot_ord * 0.85)

    base_states = get_demo_analytics()["top_states"]
    base_payments = get_demo_analytics()["payment_breakdown"]

    return {
        "kpis": {
            "revenue": round(tot_rev, 2),
            "orders": tot_ord,
            "average_order_value": aov,
            "customers": cust
        },
        "monthly_sales": analytics["monthly_revenue"],
        "top_categories": analytics["top_categories"],
        "payment_types": analytics["payment_breakdown"],
        "state_sales": analytics["top_states"],
        "filter_options": {
            "years": [{"year": 2017}, {"year": 2018}],
            "states": [{"customer_state": s["customer_state"], "orders": s["orders"]} for s in base_states],
            "payments": [{"payment_type": p["payment_type"], "total": p["total"]} for p in base_payments]
        },
        "applied_filters": filters or {}
    }

