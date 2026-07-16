from flask import Blueprint

from services.analytics_service import analytics_summary

from utils.api_response import success
from utils.cache import cache

analytics_controller = Blueprint(
    "analytics",
    __name__
)

@analytics_controller.route("/summary")
@cache.cached(timeout=120)

def summary():

    return success(
        analytics_summary()
    )