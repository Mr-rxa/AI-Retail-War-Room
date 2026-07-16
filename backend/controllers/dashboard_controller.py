from flask import Blueprint, request

from services.dashboard_service import get_dashboard
from utils.api_response import success

dashboard_controller = Blueprint("dashboard", __name__)


@dashboard_controller.route("/dashboard")
def dashboard():

    filters = {
        "year": request.args.get("year"),
        "state": request.args.get("state"),
        "payment": request.args.get("payment")
    }

    return success(get_dashboard(filters))