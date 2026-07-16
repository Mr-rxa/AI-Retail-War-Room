from flask import Blueprint, request

from services.forecast_service import forecast_sales

from utils.api_response import success, error

from utils.cache import cache

forecast_controller = Blueprint(
    "forecast",
    __name__
)


@forecast_controller.route("/sales")
@cache.cached(timeout=60)
def sales():

    try:

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

        return success(

            forecast_sales(days)

        )

    except Exception as e:

        return error(

            message="Unable to generate forecast.",

            status=500,

            error_code="FORECAST_ERROR",

            details=str(e)

        )