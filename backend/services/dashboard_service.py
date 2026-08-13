from backend.repositories.dashboard_repository import (
    fetch_kpis,
    fetch_monthly_sales,
    fetch_top_categories,
    fetch_payment_types,
    fetch_state_sales,
    fetch_filter_options
)
from backend.engines import session_store
from backend.engines import csv_engine

from backend.engines.demo_data import get_demo_dashboard

def get_dashboard(filters=None, session_id=None):
    if filters is None:
        filters = {}

    from backend.services.analytics_service import analytics_summary

    if session_id and session_store.has(session_id):
        analytics = analytics_summary(session_id, filters)
        kpis = csv_engine.fetch_kpis(session_id, filters)
        dashboard = {
            "kpis": kpis,
            "monthly_sales": csv_engine.fetch_monthly_sales(session_id, filters),
            "top_categories": csv_engine.fetch_top_categories(session_id, filters),
            "payment_types": csv_engine.fetch_payment_types(session_id, filters),
            "state_sales": csv_engine.fetch_state_sales(session_id, filters),
            "filter_options": csv_engine.fetch_filter_options(session_id),
            "applied_filters": filters,
            "analytics": analytics
        }
        entry = session_store.get(session_id)
        if entry and entry.get("currency"):
            dashboard["currency"] = entry["currency"]
    else:
        kpis = fetch_kpis(filters)
        if not kpis or not kpis.get("revenue") or kpis.get("revenue") == 0:
            dashboard = get_demo_dashboard(filters)
            dashboard["analytics"] = analytics_summary(filters=filters)
        else:
            analytics = analytics_summary(filters=filters)
            dashboard = {
                "kpis": kpis,
                "monthly_sales": fetch_monthly_sales(filters),
                "top_categories": fetch_top_categories(filters),
                "payment_types": fetch_payment_types(filters),
                "state_sales": fetch_state_sales(filters),
                "filter_options": fetch_filter_options(),
                "applied_filters": filters,
                "analytics": analytics
            }

    return dashboard



