import pandas as pd

from sklearn.ensemble import IsolationForest
from backend.repositories.analytics_repository import revenue_growth


SEVERITY_ORDER = {
    "Critical": 1,
    "High": 2,
    "Opportunity": 3,
    "Info": 4
}


def _format_month(value):

    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")

    return str(value)


def detect_anomalies(revenue_data):

    data = revenue_data

    df = pd.DataFrame(data)

    if df.empty:
        return []

    df["growth_percent"] = pd.to_numeric(
        df["growth_percent"],
        errors="coerce"
    )

    df = df.dropna()

    if len(df) < 5:
        return []

    model = IsolationForest(
        contamination=0.15,
        random_state=42
    )

    df["prediction"] = model.fit_predict(
        df[["growth_percent"]]
    )

    df["score"] = model.decision_function(
        df[["growth_percent"]]
    )

    anomalies = []

    for _, row in df.iterrows():

        if row["prediction"] != -1:
            continue

        growth = float(row["growth_percent"])

        confidence = round(
            abs(float(row["score"])) * 100,
            2
        )

        if growth < 0:

            anomaly_type = "Revenue Drop"

            severity = (
                "Critical"
                if growth < -40
                else "High"
            )

            recommendation = (
                "Review pricing, promotions, inventory "
                "and marketing campaigns immediately."
            )

            root_cause = (
                "Monthly revenue growth fell outside the normal pattern. "
                "Validate stock availability, campaign changes, pricing, "
                "delivery delays and whether the month is incomplete."
            )

            business_impact = (
                "Potential revenue pressure, lower operating momentum "
                "and increased risk to near-term forecast accuracy."
            )

        else:

            anomaly_type = "Revenue Spike"

            severity = (
                "Opportunity"
                if growth > 20
                else "Info"
            )

            recommendation = (
                "Ensure sufficient inventory and monitor "
                "whether the increase is sustainable."
            )

            root_cause = (
                "Monthly revenue growth exceeded the normal pattern. "
                "Check category demand, promotion timing, regional mix "
                "and unusually large orders."
            )

            business_impact = (
                "Demand may create upside opportunity, but inventory, "
                "fulfilment and customer experience should be monitored."
            )

        anomalies.append({

            "month": _format_month(row["month"]),

            "timeline": _format_month(row["month"]),

            "metric": "Revenue Growth",

            "anomaly_type": anomaly_type,

            "value": round(growth, 2),

            "severity": severity,

            "confidence": confidence,

            "root_cause": root_cause,

            "business_impact": business_impact,

            "recommendation": recommendation,

            "message":
            f"{anomaly_type} detected with {confidence:.1f}% confidence."

        })

    anomalies.sort(

        key=lambda x: (

            SEVERITY_ORDER[x["severity"]]

        )

    )

    return anomalies


def anomaly_summary():

    anomalies = detect_anomalies(
        revenue_growth()
    )

    summary = {
        "total": len(anomalies),
        "critical": 0,
        "high": 0,
        "opportunity": 0,
        "info": 0
    }

    for anomaly in anomalies:
        key = anomaly["severity"].lower()

        if key in summary:
            summary[key] += 1

    return {
        "summary": summary,
        "anomalies": anomalies
    }
