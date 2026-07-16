from repositories.analytics_repository import (
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
    delivery_performance
)

from services.anomaly_service import detect_anomalies
from services.business_health_service import business_health
from services.customer_intelligence_service import build_customer_intelligence
from services.insight_service import generate_insights
from services.recommendation_service import generate_recommendations
from services.forecast_service import forecast_sales
def analytics_summary():

    analytics = {

        "revenue_growth": revenue_growth(),

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

        "delivery_performance": delivery_performance()

    }

    forecast = forecast_sales()

    analytics["forecast_summary"] = forecast.get(
        "summary",
        {}
    )

    analytics["anomalies"] = detect_anomalies(analytics["revenue_growth"])
    
    analytics["business_health"] = business_health(
        analytics,
        forecast
    )

    analytics["customer_intelligence"] = build_customer_intelligence(
        analytics
    )
    
    analytics["insights"] = generate_insights(
        analytics
    )
    
    analytics["recommendations"] = generate_recommendations(
        analytics
    )

    return analytics
