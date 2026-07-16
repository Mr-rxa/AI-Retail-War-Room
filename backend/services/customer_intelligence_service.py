from backend.repositories.analytics_repository import (
    repeat_vs_new_customers_monthly,
    customer_segments,
    average_days_between_orders,
    risky_customer_regions
)


def build_customer_intelligence(analytics):

    trend = repeat_vs_new_customers_monthly()
    segments = customer_segments()
    order_gap = average_days_between_orders()
    risky_regions = risky_customer_regions()

    retention = analytics.get("customer_retention", {})
    repeat_customers = float(retention.get("repeat_customers", 0) or 0)
    total_customers = float(retention.get("total_customers", 0) or 0)
    repeat_rate = (
        (repeat_customers / total_customers) * 100
        if total_customers else 0
    )

    avg_gap = float(
        order_gap.get("avg_days_between_orders", 0) or 0
    )

    segment_map = {
        row["segment"]: row
        for row in segments
    }

    high_value = float(
        segment_map.get("High Value", {}).get("customers", 0) or 0
    )
    at_risk = float(
        segment_map.get("At Risk", {}).get("customers", 0) or 0
    )
    inactive = float(
        segment_map.get("Inactive", {}).get("customers", 0) or 0
    )

    high_value_share = (
        (high_value / total_customers) * 100
        if total_customers else 0
    )
    risk_share = (
        ((at_risk + inactive) / total_customers) * 100
        if total_customers else 0
    )

    score = 0

    if repeat_rate >= 18:
        score += 35
    elif repeat_rate >= 12:
        score += 28
    elif repeat_rate >= 8:
        score += 20
    else:
        score += 12

    if avg_gap <= 45:
        score += 25
    elif avg_gap <= 75:
        score += 18
    elif avg_gap <= 110:
        score += 12
    else:
        score += 6

    if high_value_share >= 15:
        score += 20
    elif high_value_share >= 10:
        score += 16
    elif high_value_share >= 6:
        score += 12
    else:
        score += 8

    if risk_share <= 15:
        score += 20
    elif risk_share <= 22:
        score += 15
    elif risk_share <= 30:
        score += 10
    else:
        score += 5

    if score >= 80:
        status = "Strong"
    elif score >= 65:
        status = "Stable"
    elif score >= 50:
        status = "Watch"
    else:
        status = "Fragile"

    recommendations = build_retention_recommendations(
        repeat_rate,
        avg_gap,
        risky_regions,
        segment_map
    )

    return {
        "customer_health_score": round(score, 1),
        "customer_health_status": status,
        "repeat_rate": round(repeat_rate, 2),
        "average_days_between_orders": round(avg_gap, 2),
        "high_value_share": round(high_value_share, 2),
        "risk_share": round(risk_share, 2),
        "repeat_vs_new_trend": trend,
        "segments": segments,
        "risky_regions": risky_regions,
        "recommendations": recommendations
    }


def build_retention_recommendations(
    repeat_rate,
    avg_gap,
    risky_regions,
    segment_map
):

    recommendations = []

    if repeat_rate < 10:
        recommendations.append({
            "title": "Launch a loyalty recovery push",
            "focus": "Repeat purchase rate",
            "action": "Repeat purchase is low. Run loyalty offers, bundle incentives and post-purchase email nudges to increase second orders."
        })

    if avg_gap > 90:
        recommendations.append({
            "title": "Reduce reorder delay",
            "focus": "Time between orders",
            "action": "Customers are taking too long to reorder. Use reminder campaigns, replenishment prompts and targeted discount windows."
        })

    if risky_regions:
        top_region = risky_regions[0]
        recommendations.append({
            "title": "Protect the riskiest region",
            "focus": top_region["customer_state"],
            "action": f"{top_region['customer_state']} shows the highest retention risk. Review delivery experience, local assortment and repeat-order incentives."
        })

    at_risk = float(
        segment_map.get("At Risk", {}).get("customers", 0) or 0
    )
    inactive = float(
        segment_map.get("Inactive", {}).get("customers", 0) or 0
    )

    if at_risk + inactive > 0:
        recommendations.append({
            "title": "Recover dormant value",
            "focus": "At-risk and inactive customers",
            "action": "Prioritize win-back campaigns for dormant customers and pair them with delivery-quality fixes to improve retention confidence."
        })

    if not recommendations:
        recommendations.append({
            "title": "Keep the retention engine warm",
            "focus": "Customer health",
            "action": "Customer health is relatively stable. Maintain delivery quality, loyalty nudges and high-value customer treatment."
        })

    return recommendations[:4]
