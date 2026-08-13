from datetime import datetime

STATE_NAMES = {
    "SP": "São Paulo",
    "RJ": "Rio de Janeiro",
    "MG": "Minas Gerais",
    "RS": "Rio Grande do Sul",
    "PR": "Paraná",
    "SC": "Santa Catarina",
    "BA": "Bahia",
    "DF": "Distrito Federal",
    "GO": "Goiás",
    "ES": "Espírito Santo"
}


def format_money(value, symbol="$"):
    value = float(value)
    if value >= 1000000:
        return f"{symbol} {value/1000000:.2f} Million"
    if value >= 1000:
        return f"{symbol} {value/1000:.2f} Thousand"
    return f"{symbol} {value:.2f}"


def generate_insights(analytics, currency_info=None):
    symbol = currency_info.get("symbol", "$") if currency_info else "$"
    insights = []


    # -------------------------------------------------
    # Average Order Value
    # -------------------------------------------------
    aov_raw = analytics.get("average_order_value", 0)
    if isinstance(aov_raw, dict):
        aov = float(aov_raw.get("average_order_value", 0) or 0)
    else:
        aov = float(aov_raw or 0)


    if aov >= 150:
        insights.append({
            "type": "success",
            "title": "Optimal Fleet Asset Yield",
            "message": f"Monitored units average {symbol} {aov:.2f} in operational yield, reflecting strong asset utilization."
        })
    else:
        insights.append({
            "type": "warning",
            "title": "Asset Yield Below Baseline",
            "message": "Average yield per unit is under target. Fleet route optimization and battery charging schedules could improve asset return."
        })

    # -------------------------------------------------
    # Revenue Trend
    # -------------------------------------------------
    growth = analytics["revenue_growth"]
    valid = [
        g for g in growth
        if g.get("growth_percent") is not None
        and float(g["growth_percent"]) > -80
    ]

    if valid:
        latest = valid[-1]
        g = float(latest["growth_percent"])

        if g > 10:
            trend = "Fleet revenue yield shows positive month-on-month growth."
            icon = "success"
        elif g < -10:
            trend = "Fleet yield velocity has slowed recently; battery thermal throttling intervention recommended."
            icon = "warning"
        else:
            trend = "Fleet yield and telemetry metrics remain operational and stable."
            icon = "info"

        insights.append({
            "type": icon,
            "title": "Fleet Telemetry Velocity",
            "message": trend
        })

    # -------------------------------------------------
    # Top Category
    # -------------------------------------------------
    if analytics.get("top_categories") and len(analytics["top_categories"]) > 0:
        category = analytics["top_categories"][0]
        category_name = (
            category["category"]
            .replace("_", " ")
            .title()
        )

        insights.append({
            "type": "info",
            "title": "Leading Vehicle Segment",
            "message": f"{category_name} generated {format_money(category['revenue'], symbol=symbol)} in total fleet yield."
        })

    # -------------------------------------------------
    # Top State
    # -------------------------------------------------
    if analytics.get("top_states") and len(analytics["top_states"]) > 0:
        state = analytics["top_states"][0]
        state_name = STATE_NAMES.get(
            state["customer_state"],
            state["customer_state"]
        )

        insights.append({
            "type": "info",
            "title": "Primary Regional Fleet Hub",
            "message": f"{state_name} represents the largest active vehicle concentration."
        })

    # -------------------------------------------------
    # Payment Method
    # -------------------------------------------------
    payments = analytics.get("payment_breakdown", [])
    if payments:
        total = sum(int(p["total"]) for p in payments)
        top_payment = payments[0]
        percentage = (int(top_payment["total"]) / total * 100) if total else 0

        insights.append({
            "type": "info",
            "title": "Primary Infrastructure Type",
            "message": f"{top_payment['payment_type'].replace('_',' ').title()} accounts for {percentage:.1f}% of fleet charge transactions."
        })

    # -------------------------------------------------
    # Delivery
    # -------------------------------------------------
    if analytics.get("delivery_performance"):
        delivery = float(analytics["delivery_performance"].get("avg_delivery_days", 7))

        if delivery <= 7:
            delivery_status = "Optimal"
        elif delivery <= 10:
            delivery_status = "Normal"
        elif delivery <= 15:
            delivery_status = "Elevated"
        else:
            delivery_status = "Delayed"

        insights.append({
            "type": "info",
            "title": "Maintenance Response Time",
            "message": f"Average turnaround time is {delivery:.2f} days ({delivery_status})."
        })

    # -------------------------------------------------
    # Customer Loyalty
    # -------------------------------------------------
    if analytics.get("customer_retention"):
        repeat = analytics["customer_retention"].get("repeat_customers", 0)
        total_customers = analytics["customer_retention"].get("total_customers", 1)
        repeat_rate = (repeat / total_customers * 100) if total_customers else 0

        insights.append({
            "type": "info",
            "title": "Fleet Operational Continuity",
            "message": f"{repeat_rate:.2f}% of units maintain continuous active duty status."
        })

    # -------------------------------------------------
    # Business Health
    # -------------------------------------------------
    if "business_health" in analytics:
        health = analytics["business_health"]
        insights.append({
            "type": "success",
            "title": "EV Fleet Health Index",
            "message": f"Overall EV Fleet Health Score is {health['score']}/100 ({health['grade']} - {health['status']})."
        })


    # -------------------------------------------------
    # Report Time
    # -------------------------------------------------
    insights.append({
        "type": "info",
        "title": "Report Generated",
        "message": datetime.now().strftime("%d %B %Y %H:%M")
    })

    return insights
