from backend.repositories.analytics_repository import (
    revenue_growth,
    monthly_revenue,
    monthly_orders,
    average_order_value,
    top_categories,
    top_states,
    top_products,
    payment_breakdown,
    repeat_customers,
    customer_retention,
    new_customers_monthly,
    revenue_by_weekday,
    sales_by_hour,
    delivery_performance,
    repeat_vs_new_customers_monthly,
    customer_segments,
    average_days_between_orders,
    risky_customer_regions
)

from backend.services.anomaly_service import detect_anomalies
from backend.services.business_health_service import business_health
from backend.services.customer_intelligence_service import build_customer_intelligence
from backend.services.insight_service import generate_insights
from backend.services.recommendation_service import generate_recommendations
from backend.services.forecast_service import forecast_sales
from backend.engines import session_store
from backend.engines import csv_engine
from backend.engines.demo_data import get_demo_analytics

def analytics_summary(session_id=None, filters=None):
    # ── fast path: return cached bundle when session exists and no filters ──
    if session_id and session_store.has(session_id) and not filters:
        cached = session_store.get_analytics_cache(session_id)
        if cached is not None:
            return cached

    if session_id and session_store.has(session_id):
        analytics = csv_engine.compute_analytics(session_id, filters=filters)
        history_data = analytics.get("forecast_history")
        forecast = forecast_sales(history_data=history_data)
        entry = session_store.get(session_id)
        currency_info = entry.get("currency") if entry else None
    else:
        db_growth = revenue_growth()
        if not db_growth:
            from backend.engines.demo_data import get_demo_analytics, filter_demo_analytics
            analytics = get_demo_analytics()
            if filters and any(filters.values()):
                analytics = filter_demo_analytics(analytics, filters)
            forecast = forecast_sales(history_data=analytics.get("forecast_history"))
        else:
            analytics = {
                "revenue_growth": db_growth,
                "monthly_revenue": monthly_revenue(),
                "monthly_orders": monthly_orders(),
                "average_order_value": average_order_value(),
                "top_categories": top_categories(),
                "top_states": top_states(),
                "top_products": top_products(),
                "payment_breakdown": payment_breakdown(),
                "repeat_customers": repeat_customers(),
                "customer_retention": customer_retention(),
                "new_customers": new_customers_monthly(),
                "weekday_revenue": revenue_by_weekday(),
                "sales_by_hour": sales_by_hour(),
                "delivery_performance": delivery_performance(),
                "repeat_vs_new": repeat_vs_new_customers_monthly(),
                "customer_segments": customer_segments(),
                "avg_days_between_orders": average_days_between_orders(),
                "risky_regions": risky_customer_regions()
            }
            forecast = forecast_sales()
        currency_info = None

    analytics["forecast_summary"] = forecast.get(
        "summary",
        {}
    )

    analytics["anomalies"] = detect_anomalies(analytics.get("revenue_growth", []))
    
    analytics["business_health"] = business_health(
        analytics,
        forecast
    )

    analytics["customer_intelligence"] = build_customer_intelligence(
        analytics
    )
    
    analytics["insights"] = generate_insights(
        analytics,
        currency_info=currency_info
    )
    
    analytics["recommendations"] = generate_recommendations(
        analytics
    )

    if currency_info:
        analytics["currency"] = currency_info

    # ── store in session cache (no-filter passes only) ──────────────────────
    if session_id and session_store.has(session_id) and not filters:
        session_store.set_analytics_cache(session_id, analytics)

    return analytics


