from flask import Blueprint

from backend.services.anomaly_service import anomaly_summary
from backend.utils.api_response import success
from backend.utils.cache import cache

anomaly_controller = Blueprint("anomaly", __name__)


@anomaly_controller.route("/anomalies")
@cache.cached(timeout=120)
def anomalies():

    return success(
        anomaly_summary()
    )
