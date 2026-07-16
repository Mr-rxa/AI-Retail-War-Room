import pandas as pd

from prophet import Prophet

from repositories.forecast_repository import sales_history
from utils.cache import cache


@cache.memoize(timeout=60)
def forecast_sales(days=30):

    history = sales_history()

    df = pd.DataFrame(history)

    if df.empty:

        return {

            "historical": [],

            "forecast": [],

            "summary": {}

        }

    df["ds"] = pd.to_datetime(df["ds"])

    df["y"] = pd.to_numeric(df["y"])

    # -----------------------------
    # Train Prophet
    # -----------------------------

    model = Prophet(

        yearly_seasonality=True,

        weekly_seasonality=True,

        daily_seasonality=False,

        changepoint_prior_scale=0.15

    )

    model.fit(df)

    future = model.make_future_dataframe(

        periods=days,

        freq="D"

    )

    prediction = model.predict(future)

    # -----------------------------
    # Historical Data
    # -----------------------------

    historical = []

    for _, row in df.iterrows():

        historical.append({

            "date": row["ds"].strftime("%Y-%m-%d"),

            "sales": round(float(row["y"]), 2)

        })

    # -----------------------------
    # Forecast
    # -----------------------------

    future_df = prediction.tail(days)

    forecast = []

    for _, row in future_df.iterrows():

        forecast.append({

            "date": row["ds"].strftime("%Y-%m-%d"),

            "forecast": round(float(row["yhat"]), 2),

            "lower": round(float(row["yhat_lower"]), 2),

            "upper": round(float(row["yhat_upper"]), 2)

        })

    # -----------------------------
    # Forecast Statistics
    # -----------------------------

    forecasts = [

        f["forecast"]

        for f in forecast

    ]

    upper = [

        f["upper"]

        for f in forecast

    ]

    lower = [

        f["lower"]

        for f in forecast

    ]

    latest_actual = historical[-1]["sales"]

    latest_prediction = forecast[-1]["forecast"]

    growth = (

        (

            latest_prediction

            - latest_actual

        )

        /

        latest_actual

    ) * 100

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

        "highest_forecast": round(max(forecasts), 2),

        "lowest_forecast": round(min(forecasts), 2),

        "average_forecast": round(sum(forecasts) / len(forecasts), 2),

        "confidence_width": round(

            sum(

                u - l

                for u, l in zip(upper, lower)

            )

            /

            len(upper),

            2

        ),

        "forecast_days": days

    }

    return {

        "historical": historical,

        "forecast": forecast,

        "summary": summary

    }
