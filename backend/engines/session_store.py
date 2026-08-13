"""
session_store.py
────────────────
In-memory store that holds one uploaded DataFrame + metadata per browser session.

Each entry is keyed by a session_id string and contains:
    {
        "df":        pandas.DataFrame  (the normalised flat table),
        "mapping":   dict              (logical → actual column names),
        "currency":  dict              (symbol, code, name, position),
        "filename":  str,
        "uploaded_at": datetime
    }

Entries older than TTL_SECONDS are evicted lazily on every write.
"""

import threading
from datetime import datetime, timedelta

# ── configuration ────────────────────────────────────────────────────────────
TTL_SECONDS = 3600          # 1 hour; uploaded data lives this long
MAX_SESSIONS = 50           # cap to avoid unbounded memory use

# ── thread-safe store ────────────────────────────────────────────────────────
_lock  = threading.Lock()
_store: dict = {}           # { session_id: entry_dict }


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _evict_expired():
    """Remove entries older than TTL_SECONDS.  Must be called inside _lock."""
    cutoff = datetime.utcnow() - timedelta(seconds=TTL_SECONDS)
    expired = [sid for sid, e in _store.items() if e["uploaded_at"] < cutoff]
    for sid in expired:
        del _store[sid]


def _evict_oldest():
    """Remove the single oldest entry when the store is full."""
    if not _store:
        return
    oldest = min(_store, key=lambda sid: _store[sid]["uploaded_at"])
    del _store[oldest]


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def save(session_id: str, df, mapping: dict, currency: dict, filename: str):
    """
    Persist a processed DataFrame for the given session.

    Parameters
    ----------
    session_id : str
    df         : pandas.DataFrame  (normalised, columns renamed to logical names)
    mapping    : dict              (original → logical column mapping used)
    currency   : dict              (symbol, code, name, position)
    filename   : str               (original uploaded filename)
    """
    with _lock:
        _evict_expired()
        if len(_store) >= MAX_SESSIONS and session_id not in _store:
            _evict_oldest()

        _store[session_id] = {
            "df":              df,
            "mapping":         mapping,
            "currency":        currency,
            "filename":        filename,
            "uploaded_at":     datetime.utcnow(),
            "analytics_cache": None,   # populated by analytics_service after first compute
            "forecast_cache":  None,   # populated by forecast_service after first compute
        }


def get(session_id: str) -> dict | None:
    """Return the stored entry for *session_id*, or None if absent / expired."""
    with _lock:
        entry = _store.get(session_id)
        if entry is None:
            return None
        # lazy TTL check
        if datetime.utcnow() - entry["uploaded_at"] > timedelta(seconds=TTL_SECONDS):
            del _store[session_id]
            return None
        return entry


def has(session_id: str) -> bool:
    """True if an active (non-expired) entry exists for *session_id*."""
    return get(session_id) is not None


def clear(session_id: str):
    """Remove the entry for *session_id* (no-op if absent)."""
    with _lock:
        _store.pop(session_id, None)


def set_analytics_cache(session_id: str, analytics: dict):
    """Store a pre-computed analytics bundle for the session."""
    with _lock:
        entry = _store.get(session_id)
        if entry is not None:
            entry["analytics_cache"] = analytics


def get_analytics_cache(session_id: str) -> dict | None:
    """Return the cached analytics bundle, or None if not yet computed."""
    entry = get(session_id)  # uses TTL-aware getter
    if entry is None:
        return None
    return entry.get("analytics_cache")


def set_forecast_cache(session_id: str, forecast: dict):
    """Store a pre-computed forecast bundle for the session."""
    with _lock:
        entry = _store.get(session_id)
        if entry is not None:
            entry["forecast_cache"] = forecast


def get_forecast_cache(session_id: str) -> dict | None:
    """Return the cached forecast bundle, or None if not yet computed."""
    entry = get(session_id)
    if entry is None:
        return None
    return entry.get("forecast_cache")


def status(session_id: str) -> dict:
    """
    Return a lightweight status dict for the frontend data-source badge.

    Returns
    -------
    {
        "source":   "csv" | "static",
        "filename": str | None,
        "currency": dict | None,
        "rows":     int | None,
        "uploaded_at": str | None   (ISO format)
    }
    """
    entry = get(session_id)
    if entry is None:
        return {
            "source":      "static",
            "filename":    None,
            "currency":    None,
            "rows":        None,
            "uploaded_at": None,
        }
    return {
        "source":      "csv",
        "filename":    entry["filename"],
        "currency":    entry["currency"],
        "rows":        len(entry["df"]),
        "uploaded_at": entry["uploaded_at"].isoformat(),
    }
