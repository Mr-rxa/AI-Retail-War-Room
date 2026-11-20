"""
bi_controller.py — REST API Controller for Interactive BI & SQL Studio
Endpoints:
  GET  /api/bi/schema        - Tables, columns, and data types
  POST /api/bi/query         - Execute read-only SQL query with safety checks
  POST /api/bi/text-to-sql   - Translate natural language into optimized SQL
  GET  /api/bi/templates     - Curated analytical SQL query templates
"""

from flask import Blueprint, request, jsonify
from backend.engines.bi_sql_engine import (
    execute_safe_query,
    get_database_schema,
    text_to_sql_copilot,
    get_curated_bi_templates
)

bi_bp = Blueprint("bi_bp", __name__, url_prefix="/api/bi")

@bi_bp.route("/schema", methods=["GET"])
def get_schema():
    session_id = request.headers.get("X-Session-ID") or request.args.get("session_id")
    schema = get_database_schema(session_id=session_id)
    return jsonify(schema)

@bi_bp.route("/query", methods=["POST"])
def run_query():
    data = request.get_json(silent=True) or {}
    sql = data.get("sql", "")
    session_id = request.headers.get("X-Session-ID") or data.get("session_id")
    max_rows = int(data.get("max_rows", 1000))

    result = execute_safe_query(sql_query=sql, session_id=session_id, max_rows=max_rows)
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code

@bi_bp.route("/text-to-sql", methods=["POST"])
def text_to_sql():
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt", "")
    session_id = request.headers.get("X-Session-ID") or data.get("session_id")

    result = text_to_sql_copilot(prompt=prompt, session_id=session_id)
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code

@bi_bp.route("/templates", methods=["GET"])
def get_templates():
    templates = get_curated_bi_templates()
    return jsonify({"success": True, "templates": templates})
