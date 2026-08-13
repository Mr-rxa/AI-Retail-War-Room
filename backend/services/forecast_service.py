import logging
import pandas as pd
import numpy as np
from backend.repositories.forecast_repository import sales_history
from backend.engines.demo_data import get_demo_analytics

def forecast_sales(days=30, history_data=None):
    if history_data is not None:
        history = history_data
    else:
        history = sales_history()

    if not history:
        history = get_demo_analytics().get("forecast_history", [])

    df = pd.DataFrame(history)

    if df.empty:
        return {
            "historical": [],
            "forecast": [],
            "summary": {
                "latest_actual": 0.0,
                "forecast_end": 0.0,
                "change_percent": 0.0,
                "trend": "Stable",
                "highest_forecast": 0.0,
                "lowest_forecast": 0.0,
                "average_forecast": 0.0,
                "confidence_width": 0.0,
                "forecast_days": days,
                "model_type": "none"
            }
        }

    df["ds"] = pd.to_datetime(df["ds"])
    df["y"] = pd.to_numeric(df["y"])

    historical = []
    for _, row in df.iterrows():
        historical.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "sales": round(float(row["y"]), 2)
        })

    forecast = []
    model_type = "prophet"
    try:
        from prophet import Prophet
        date_span = (df["ds"].max() - df["ds"].min()).days if len(df) > 1 else 0
        use_yearly = date_span >= 365

        model = Prophet(
            yearly_seasonality=use_yearly,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.15
        )
        model.fit(df)
        future = model.make_future_dataframe(periods=days, freq="D")
        prediction = model.predict(future)
        future_df = prediction.tail(days)

        for _, row in future_df.iterrows():
            forecast.append({
                "date": row["ds"].strftime("%Y-%m-%d"),
                "forecast": round(float(row["yhat"]), 2),
                "lower": round(float(row["yhat_lower"]), 2),
                "upper": round(float(row["yhat_upper"]), 2)
            })
    except Exception as e:
        logging.warning(f"Prophet forecast model failed, falling back to linear trend: {e}")
        model_type = "linear_fallback"
        last_date = df["ds"].max()
        last_val = df["y"].iloc[-1] if not df.empty else 1000.0
        avg_val = df["y"].mean() if not df.empty else 1000.0

        for i in range(1, days + 1):
            next_date = last_date + pd.Timedelta(days=i)
            est = max(100.0, float(last_val + (i * (avg_val * 0.005))))
            forecast.append({
                "date": next_date.strftime("%Y-%m-%d"),
                "forecast": round(est, 2),
                "lower": round(est * 0.9, 2),
                "upper": round(est * 1.1, 2)
            })

    forecasts = [f["forecast"] for f in forecast]
    upper = [f["upper"] for f in forecast]
    lower = [f["lower"] for f in forecast]

    latest_actual = historical[-1]["sales"] if historical else 1.0
    latest_prediction = forecast[-1]["forecast"] if forecast else 1.0

    growth = ((latest_prediction - latest_actual) / (latest_actual or 1.0)) * 100

    if growth > 5:
        trend = "Increasing"
    elif growth < -5:
        trend = "Declining"
    else:
        trend = "Stable"

    summary = {
        "latest_actual": round(latest_actual, 2),
        "forecast_end": round(latest_prediction, 2),
        "change_percent": round(growth, 2),
        "trend": trend,
        "highest_forecast": round(max(forecasts) if forecasts else 0, 2),
        "lowest_forecast": round(min(forecasts) if forecasts else 0, 2),
        "average_forecast": round(sum(forecasts) / len(forecasts) if forecasts else 0, 2),
        "confidence_width": round(
            sum(u - l for u, l in zip(upper, lower)) / len(upper) if upper else 0,
            2
        ),
        "forecast_days": days,
        "model_type": model_type
    }

    return {
        "historical": historical,
        "forecast": forecast,
        "summary": summary
    }

