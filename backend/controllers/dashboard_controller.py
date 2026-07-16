from flask import Blueprint, request

from backend.services.dashboard_service import get_dashboard
from backend.utils.api_response import success

dashboard_controller = Blueprint("dashboard", __name__)


@dashboard_controller.route("/dashboard")
def dashboard():

    filters = {
        "year": request.args.get("year"),
        "state": request.args.get("state"),
        "payment": request.args.get("payment")
    }

    return success(get_dashboard(filters))