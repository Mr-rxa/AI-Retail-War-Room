from flask import Blueprint, request

from backend.services.analytics_service import analytics_summary

from backend.services.ai_service import business_advisor

from backend.utils.api_response import success

ai_controller = Blueprint(
    "ai",
    __name__
)
@ai_controller.route("/advisor")
def advisor():

    session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id")

    analytics = analytics_summary(session_id=session_id)

    report = business_advisor(analytics)

    return success({

        "report": report

    })

