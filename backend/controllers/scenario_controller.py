"""
scenario_controller.py — Blueprint controller for What-If Simulation
"""
from flask import Blueprint, request, jsonify
from backend.services.scenario_service import simulate_scenario

scenario_controller = Blueprint("scenario_controller", __name__)

@scenario_controller.route("/simulate", methods=["POST"])
def handle_simulation():
    body = request.get_json(silent=True) or {}
    session_id = request.headers.get("X-Session-ID") or request.cookies.get("airw_session_id")
    filters = {
        "year": body.get("year") or request.args.get("year"),
        "state": body.get("state") or request.args.get("state"),
        "payment": body.get("payment") or request.args.get("payment")
    }

    result = simulate_scenario(body, session_id=session_id, filters=filters)
    return jsonify(result)
