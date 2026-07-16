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


def format_money(value):

    value = float(value)

    if value >= 1000000:
        return f"R$ {value/1000000:.2f} Million"

    if value >= 1000:
        return f"R$ {value/1000:.2f} Thousand"

    return f"R$ {value:.2f}"


def generate_insights(analytics):

    insights = []

    # -------------------------------------------------
    # Average Order Value
    # -------------------------------------------------

    aov = float(
        analytics["average_order_value"]["average_order_value"]
    )

    if aov >= 150:

        insights.append({

            "type": "success",

            "title": "Healthy Average Order Value",

            "message":
            f"Customers spend an average of R$ {aov:.2f} per order, indicating healthy purchasing behaviour."

        })

    else:

        insights.append({

            "type": "warning",

            "title": "Low Average Order Value",

            "message":
            "Average order value is relatively low. Product bundles and cross-selling could improve basket size."

        })

    # -------------------------------------------------
    # Revenue Trend
    # -------------------------------------------------

    growth = analytics["revenue_growth"]

    valid = [

        g

        for g in growth

        if g["growth_percent"] is not None
        and float(g["growth_percent"]) > -80

    ]

    if valid:

        latest = valid[-1]

        g = float(latest["growth_percent"])

        if g > 10:

            trend = "Revenue is showing positive month-on-month growth."

            icon = "success"

        elif g < -10:

            trend = "Revenue has slowed recently and should be monitored."

            icon = "warning"

        else:

            trend = "Revenue remains relatively stable."

            icon = "info"

        insights.append({

            "type": icon,

            "title": "Revenue Trend",

            "message": trend

        })

    # -------------------------------------------------
    # Top Category
    # -------------------------------------------------

    category = analytics["top_categories"][0]

    category_name = (

        category["category"]

        .replace("_", " ")

        .title()

    )

    insights.append({

        "type": "info",

        "title": "Top Performing Category",

        "message":
        f"{category_name} generated {format_money(category['revenue'])} in revenue."

    })

    # -------------------------------------------------
    # Top State
    # -------------------------------------------------

    state = analytics["top_states"][0]

    state_name = STATE_NAMES.get(

        state["customer_state"],

        state["customer_state"]

    )

    insights.append({

        "type": "info",

        "title": "Highest Revenue State",

        "message":
        f"{state_name} contributes the highest share of sales."

    })

    # -------------------------------------------------
    # Payment Method
    # -------------------------------------------------

    payments = analytics["payment_breakdown"]

    total = sum(

        int(p["total"])

        for p in payments

    )

    top_payment = payments[0]

    percentage = (

        int(top_payment["total"])

        / total

    ) * 100

    insights.append({

        "type": "info",

        "title": "Preferred Payment Method",

        "message":
        f"{top_payment['payment_type'].replace('_',' ').title()} accounts for {percentage:.1f}% of all payments."

    })

    # -------------------------------------------------
    # Delivery
    # -------------------------------------------------

    delivery = float(

        analytics["delivery_performance"]["avg_delivery_days"]

    )

    if delivery <= 7:

        delivery_status = "Excellent"

    elif delivery <= 10:

        delivery_status = "Good"

    elif delivery <= 15:

        delivery_status = "Average"

    else:

        delivery_status = "Slow"

    insights.append({

        "type": "info",

        "title": "Delivery Performance",

        "message":
        f"Average delivery time is {delivery:.2f} days ({delivery_status})."

    })

    # -------------------------------------------------
    # Customer Loyalty
    # -------------------------------------------------

    repeat = analytics["customer_retention"]["repeat_customers"]

    total_customers = analytics["customer_retention"]["total_customers"]

    repeat_rate = (

        repeat / total_customers

    ) * 100

    insights.append({

        "type": "info",

        "title": "Customer Loyalty",

        "message":
        f"{repeat_rate:.2f}% of customers placed more than one order."

    })

    # -------------------------------------------------
    # Business Health
    # -------------------------------------------------

    if "business_health" in analytics:

        health = analytics["business_health"]

        insights.append({

            "type": "success",

            "title": "Business Health",

            "message":
            f"Overall Business Health Score is {health['score']}/100 ({health['grade']} - {health['status']})."

        })

    # -------------------------------------------------
    # Report Time
    # -------------------------------------------------

    insights.append({

        "type": "info",

        "title": "Report Generated",

        "message":
        datetime.now().strftime("%d %B %Y %H:%M")

    })

    return insights
