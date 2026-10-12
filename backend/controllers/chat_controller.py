"""
chat_controller.py — Blueprint controller for NLP Chat "Talk to Your Data"
"""
from flask import Blueprint, request, jsonify
from backend.services.chat_service import query_data_ai

chat_controller = Blueprint("chat_controller", __name__)

@chat_controller.route("/query", methods=["POST"])
def handle_chat_query():
    body = request.get_json(silent=True) or {}
    query = body.get("query", "")
    session_id = request.headers.get("X-Session-ID") or request.cookies.get("airw_session_id")
    filters = {
        "year": body.get("year") or request.args.get("year"),
        "state": body.get("state") or request.args.get("state"),
        "payment": body.get("payment") or request.args.get("payment")
    }

    result = query_data_ai(query, session_id=session_id, filters=filters)
    return jsonify(result)
