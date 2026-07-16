def generate_recommendations(analytics):

    recommendations = []

    # ----------------------------------------
    # Revenue Growth
    # ----------------------------------------

    growth_data = analytics["revenue_growth"]

    valid_growth = [

        g

        for g in growth_data

        if g["growth_percent"] is not None
        and float(g["growth_percent"]) > -80

    ]

    if valid_growth:

        latest = valid_growth[-1]

        growth = float(latest["growth_percent"])

        if growth < -15:

            recommendations.append({

                "priority": "High",

                "title": "Revenue Declining",

                "action":
                "Revenue has declined significantly. Launch targeted promotions, review pricing strategy and increase marketing spend."

            })

        elif growth > 20:

            recommendations.append({

                "priority": "Low",

                "title": "Strong Revenue Growth",

                "action":
                "Maintain current strategy and ensure inventory can support increasing demand."

            })

    # ----------------------------------------
    # Average Order Value
    # ----------------------------------------

    aov = float(

        analytics["average_order_value"]["average_order_value"]

    )

    if aov < 200:

        recommendations.append({

            "priority": "Medium",

            "title": "Increase Basket Size",

            "action":
            "Introduce combo offers, product bundles and cross-selling to improve average order value."

        })

    # ----------------------------------------
    # Delivery Performance
    # ----------------------------------------

    delivery = float(

        analytics["delivery_performance"]["avg_delivery_days"]

    )

    if delivery > 10:

        recommendations.append({

            "priority": "High",

            "title": "Improve Logistics",

            "action":
            "Average delivery time is high. Optimize warehouse operations and evaluate courier performance."

        })

    # ----------------------------------------
    # Customer Loyalty
    # ----------------------------------------

    repeat = analytics["customer_retention"]["repeat_customers"]

    total = analytics["customer_retention"]["total_customers"]

    repeat_rate = (

        repeat / total * 100

        if total > 0 else 0

    )

    if repeat_rate < 10:

        recommendations.append({

            "priority": "Medium",

            "title": "Increase Customer Retention",

            "action":
            "Launch loyalty programs, personalized offers and email campaigns to encourage repeat purchases."

        })

    # ----------------------------------------
    # Payment Mix
    # ----------------------------------------

    payments = analytics["payment_breakdown"]

    total_payments = sum(

        int(p["total"])

        for p in payments

    )

    credit = next(

        (

            p

            for p in payments

            if p["payment_type"] == "credit_card"

        ),

        None

    )

    if credit:

        credit_share = (

            int(credit["total"])

            / total_payments

        ) * 100

        if credit_share > 70:

            recommendations.append({

                "priority": "Low",

                "title": "Diversify Payment Methods",

                "action":
                "Credit cards dominate payments. Promote boleto, debit cards and vouchers through incentives."

            })

    # ----------------------------------------
    # Best Category
    # ----------------------------------------

    top_category = analytics["top_categories"][0]

    category = (

        top_category["category"]

        .replace("_", " ")

        .title()

    )

    recommendations.append({

        "priority": "Low",

        "title": "Inventory Planning",

        "action":
        f"Increase inventory allocation for {category}, as it is currently the highest revenue generating category."

    })

    # ----------------------------------------
    # Business Health
    # ----------------------------------------

    if "business_health" in analytics:

        health = analytics["business_health"]["score"]

        if health < 60:

            recommendations.append({

                "priority": "High",

                "title": "Business Recovery Plan",

                "action":
                "Business Health Score is low. Review pricing, customer retention, logistics and operational efficiency immediately."

            })

    # ----------------------------------------
    # Active Anomalies
    # ----------------------------------------

    if "anomalies" in analytics:

        anomalies = analytics["anomalies"]

        if len(anomalies) > 0:

            recommendations.append({

                "priority": "Medium",

                "title": "Investigate Anomalies",

                "action":
                f"{len(anomalies)} abnormal business events were detected. Review them to identify potential risks or opportunities."

            })

    # ----------------------------------------
    # Sort by Priority
    # ----------------------------------------

    priority_order = {

        "High": 1,

        "Medium": 2,

        "Low": 3

    }

    recommendations.sort(

        key=lambda x: priority_order[x["priority"]]

    )

    return recommendations
