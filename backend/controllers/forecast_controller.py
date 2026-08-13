from flask import Blueprint, request

from backend.services.forecast_service import forecast_sales
from backend.utils.api_response import success, error
from backend.utils.cache import cache

forecast_controller = Blueprint(
    "forecast",
    __name__
)


from backend.engines import session_store
from backend.engines import csv_engine

@forecast_controller.route("/sales")
def sales():

    try:
        session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id")

        days = request.args.get(
            "days",
            default=30,
            type=int
        )

        if days < 1 or days > 90:

            return error(

                message="Forecast days must be between 1 and 90.",

                status=400,

                error_code="INVALID_FORECAST_DAYS"

            )

        history_data = None
        if session_id and session_store.has(session_id):
            # Return cached forecast if available (avoids double Prophet computation)
            cached_forecast = session_store.get_forecast_cache(session_id)
            if cached_forecast is not None:
                return success(cached_forecast)
            history_data = csv_engine.sales_history(session_id)

        result = forecast_sales(days=days, history_data=history_data)

        # Cache forecast per session so the forecast page doesn't rerun Prophet
        if session_id and session_store.has(session_id):
            session_store.set_forecast_cache(session_id, result)

        return success(result)



    except Exception as e:

        return error(

            message="Unable to generate forecast.",

            status=500,

            error_code="FORECAST_ERROR",

            details=str(e)

        )