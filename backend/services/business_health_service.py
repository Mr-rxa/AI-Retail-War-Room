from statistics import mean

def _latest_valid_growth(revenue_growth):

    valid = []

    for row in revenue_growth:

        growth = row.get("growth_percent")

        if growth is None:
            continue

        try:
            growth = float(growth)

        except Exception:
            continue

        # Ignore incomplete Olist months
        if growth <= -80:
            continue

        valid.append(growth)

    return valid


def business_health(analytics,forecast):

    score = 0

    breakdown = []

    # =====================================================
    # Revenue Trend (30)
    # =====================================================

    growth_values = _latest_valid_growth(
        analytics["revenue_growth"]
    )

    if growth_values:

        avg_growth = mean(growth_values[-12:])

        if avg_growth >= 15:
            revenue_score = 30

        elif avg_growth >= 10:
            revenue_score = 27

        elif avg_growth >= 5:
            revenue_score = 24

        elif avg_growth >= 0:
            revenue_score = 20

        elif avg_growth >= -5:
            revenue_score = 15

        elif avg_growth >= -10:
            revenue_score = 10

        else:
            revenue_score = 5

    else:

        revenue_score = 15

    score += revenue_score

    breakdown.append({

        "metric": "Revenue Trend",

        "score": revenue_score,

        "max": 30

    })

    # =====================================================
    # Customer Retention (20)
    # =====================================================

    repeat = analytics["customer_retention"]["repeat_customers"]

    total = analytics["customer_retention"]["total_customers"]

    repeat_rate = (

        repeat / total * 100

        if total else 0

    )

    if repeat_rate >= 20:
        retention_score = 20

    elif repeat_rate >= 15:
        retention_score = 18

    elif repeat_rate >= 10:
        retention_score = 15

    elif repeat_rate >= 5:
        retention_score = 10

    else:
        retention_score = 5

    score += retention_score

    breakdown.append({

        "metric": "Customer Retention",

        "score": retention_score,

        "max": 20

    })

    # =====================================================
    # Delivery (15)
    # =====================================================

    delivery = float(

        analytics["delivery_performance"]["avg_delivery_days"]

    )

    if delivery <= 5:
        delivery_score = 15

    elif delivery <= 7:
        delivery_score = 13

    elif delivery <= 10:
        delivery_score = 11

    elif delivery <= 12:
        delivery_score = 9

    elif delivery <= 15:
        delivery_score = 6

    else:
        delivery_score = 3

    score += delivery_score

    breakdown.append({

        "metric": "Delivery",

        "score": delivery_score,

        "max": 15

    })

    # =====================================================
    # Average Order Value (15)
    # =====================================================

    aov = float(

        analytics["average_order_value"]["average_order_value"]

    )

    if aov >= 250:
        aov_score = 15

    elif aov >= 200:
        aov_score = 13

    elif aov >= 175:
        aov_score = 11

    elif aov >= 150:
        aov_score = 9

    else:
        aov_score = 6

    score += aov_score

    breakdown.append({

        "metric": "Average Order Value",

        "score": aov_score,

        "max": 15

    })

    # =====================================================
    # Anomalies (10)
    # =====================================================

    anomalies = analytics.get("anomalies", [])

    critical = len(

        [

            a

            for a in anomalies

            if a["severity"] == "Critical"

        ]

    )

    if critical == 0:
        anomaly_score = 10

    elif critical == 1:
        anomaly_score = 8

    elif critical == 2:
        anomaly_score = 6

    else:
        anomaly_score = 3

    score += anomaly_score

    breakdown.append({

        "metric": "Anomalies",

        "score": anomaly_score,

        "max": 10

    })

    # =====================================================
    # Forecast (10)
    # =====================================================

    summary = forecast["summary"]

    trend = summary.get("trend", "Stable")

    growth = summary.get("change_percent", 0)

    confidence = summary.get("confidence_width", 0)

    if trend == "Increasing":

        forecast_score = 10

    elif trend == "Stable":

        forecast_score = 8

    else:

        forecast_score = 5

    # Penalize highly uncertain forecasts

    if confidence > 100000:

        forecast_score -= 2

    # Reward stronger growth

    if growth > 10:

        forecast_score += 1

    forecast_score = max(0, min(forecast_score, 10))

    score += forecast_score

    breakdown.append({

        "metric": "Forecast",

        "score": forecast_score,

        "max": 10

    })

    # =====================================================
    # Final Grade
    # =====================================================

    score = round(score)

    if score >= 90:

        grade = "A+"

        status = "Excellent"

    elif score >= 80:

        grade = "A"

        status = "Healthy"

    elif score >= 70:

        grade = "B"

        status = "Stable"

    elif score >= 60:

        grade = "C"

        status = "Needs Attention"

    else:

        grade = "D"

        status = "Critical"

    return {

        "score": score,

        "grade": grade,

        "status": status,

        "repeat_rate": round(repeat_rate, 2),

        "average_order_value": round(aov, 2),

        "average_delivery_days": round(delivery, 2),

        "forecast_trend": trend,

        "forecast_growth": round(growth, 2),

        "breakdown": breakdown

    }