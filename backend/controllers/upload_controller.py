"""
upload_controller.py
───────────────────
Flask Blueprint for handling CSV upload, validation, mapping confirmation,
currency configuration, and data source clearing.
"""

import io
import pandas as pd
from flask import Blueprint, request
from backend.utils.api_response import success, error
from backend.utils.csv_validator import analyse_upload
from backend.engines.csv_engine import build_normalised_df
from backend.engines import session_store

upload_controller = Blueprint("upload", __name__)

CURRENCIES = [
    {"code": "USD", "symbol": "$", "name": "US Dollar", "position": "before"},
    {"code": "EUR", "symbol": "€", "name": "Euro", "position": "before"},
    {"code": "GBP", "symbol": "£", "name": "British Pound", "position": "before"},
    {"code": "INR", "symbol": "₹", "name": "Indian Rupee", "position": "before"},
    {"code": "BRL", "symbol": "R$", "name": "Brazilian Real", "position": "before"},
    {"code": "AED", "symbol": "د.إ", "name": "UAE Dirham", "position": "before"},
    {"code": "CAD", "symbol": "CA$", "name": "Canadian Dollar", "position": "before"},
    {"code": "AUD", "symbol": "A$", "name": "Australian Dollar", "position": "before"},
    {"code": "JPY", "symbol": "¥", "name": "Japanese Yen", "position": "before"},
    {"code": "CNY", "symbol": "¥", "name": "Chinese Yuan", "position": "before"}
]

@upload_controller.route("/analyze", methods=["POST"])
def analyze():
    """
    Step 1: Receive file, run validation and auto-column detection.
    Does NOT store the dataset yet. Returns preview and detected mapping.
    """
    if "file" not in request.files:
        return error("No file uploaded under key 'file'.", status=400, error_code="NO_FILE")

    file_storage = request.files["file"]
    if not file_storage.filename:
        return error("Selected file has no filename.", status=400, error_code="EMPTY_FILENAME")

    result = analyse_upload(file_storage)
    if not result["valid"]:
        return error(result["error"], status=400, error_code="INVALID_CSV", details={"warnings": result.get("warnings", [])})

    return success(result)


@upload_controller.route("/confirm", methods=["POST"])
def confirm():
    """
    Step 2: Confirm mapping, currency, and file to save to session store.
    Expects JSON body or multipart form:
      - file: the CSV file (if non-persisted client-side)
      - mapping: dict of logical_field -> csv_column
      - currency: dict of { code, symbol, name, position }
      - session_id: str (optional, defaults to header/cookie)
    """
    session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id") or "default_session"

    mapping_raw = request.form.get("mapping")
    currency_raw = request.form.get("currency")

    import json
    try:
        mapping = json.loads(mapping_raw) if mapping_raw else request.json.get("mapping", {}) if request.is_json else {}
    except Exception:
        mapping = {}

    try:
        currency = json.loads(currency_raw) if currency_raw else request.json.get("currency", {}) if request.is_json else {}
    except Exception:
        currency = {"code": "USD", "symbol": "$", "name": "US Dollar", "position": "before"}

    if not currency or not currency.get("symbol"):
        currency = {"code": "USD", "symbol": "$", "name": "US Dollar", "position": "before"}

    if "file" in request.files:
        file_storage = request.files["file"]
        filename = file_storage.filename or "uploaded.csv"
        try:
            target_cols = [c for c in mapping.values() if c]
            raw_df = pd.read_csv(file_storage.stream, usecols=target_cols if target_cols else None, low_memory=False)
        except Exception as e:
            return error(f"Failed to parse CSV file: {str(e)}", status=400, error_code="PARSE_ERROR")
    else:
        return error("CSV file missing in confirm request.", status=400, error_code="NO_FILE")

    # Build normalised df
    try:
        norm_df = build_normalised_df(raw_df, mapping)
    except Exception as e:
        return error(f"Failed to build dataset with provided mapping: {str(e)}", status=400, error_code="MAPPING_ERROR")


    # Save to session store
    session_store.save(
        session_id=session_id,
        df=norm_df,
        mapping=mapping,
        currency=currency,
        filename=filename
    )

    # Pre-cache analytics and forecast in memory so Fleet Analytics & Causal Analysis load instantly
    try:
        from backend.services.analytics_service import analytics_summary
        analytics_summary(session_id=session_id)
    except Exception as e:
        import logging
        logging.warning(f"Pre-cache analytics failed for session {session_id}: {e}")

    return success({
        "message": "Dataset successfully uploaded and configured.",
        "session_id": session_id,
        "status": session_store.status(session_id)
    })



@upload_controller.route("/status", methods=["GET"])
def get_status():
    """Return the current active data source status for the session."""
    session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id") or "default_session"
    return success(session_store.status(session_id))


@upload_controller.route("/clear", methods=["POST", "DELETE"])
def clear_data():
    """Clear session CSV data, falling back to static PostgreSQL data."""
    session_id = request.headers.get("X-Session-ID") or request.cookies.get("session_id") or "default_session"
    session_store.clear(session_id)
    return success({"message": "Custom data cleared. Fallback to demo data active."})


@upload_controller.route("/currencies", methods=["GET"])
def get_currencies():
    """Get list of supported currencies."""
    return success(CURRENCIES)
