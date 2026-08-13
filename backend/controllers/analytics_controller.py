from flask import Blueprint, request

from backend.services.analytics_service import analytics_summary

from backend.utils.api_response import success

analytics_controller = Blueprint(
    "analytics",
    __name__
)

@analytics_controller.route("/summary")
def summary():
    session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id")
    filters = {
        "year": request.args.get("year"),
        "state": request.args.get("state"),
        "payment": request.args.get("payment")
    }
    return success(
        analytics_summary(session_id=session_id, filters=filters)
    )
