from flask import Blueprint

from services.anomaly_service import anomaly_summary
from utils.api_response import success
from utils.cache import cache

anomaly_controller = Blueprint("anomaly", __name__)


@anomaly_controller.route("/anomalies")
@cache.cached(timeout=120)
def anomalies():

    return success(
        anomaly_summary()
    )
