from flask import Blueprint, request

from backend.services.anomaly_service import anomaly_summary
from backend.utils.api_response import success

anomaly_controller = Blueprint("anomaly", __name__)


@anomaly_controller.route("/anomalies")
def anomalies():

    session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id")

    return success(
        anomaly_summary(session_id=session_id)
    )

