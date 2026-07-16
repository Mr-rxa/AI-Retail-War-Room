from flask import Blueprint

from services.analytics_service import analytics_summary

from services.ai_service import business_advisor

from utils.api_response import success
from utils.cache import cache

ai_controller = Blueprint(
    "ai",
    __name__
)
@ai_controller.route("/advisor")
@cache.cached(timeout=180, query_string=True)

def advisor():

    analytics = analytics_summary()

    report = business_advisor(analytics)

    return success({

        "report": report

    })
