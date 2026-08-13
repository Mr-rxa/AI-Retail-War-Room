import logging
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from .config import Config

logger = logging.getLogger("backend.database")

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg2",
    username=Config.DB_USER or "postgres",
    password=Config.DB_PASSWORD or "",
    host=Config.DB_HOST or "localhost",
    port=Config.DB_PORT or 5432,
    database=Config.DB_NAME or "postgres"
)

_db_available = True
engine = None

try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 2}
    )
except Exception as e:
    logger.warning(f"Could not initialize engine: {e}")
    _db_available = False


def execute_query(query, params=None):
    global _db_available
    if not engine or not _db_available:
        return []
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            return [dict(row._mapping) for row in result]
    except Exception as e:
        logger.warning(f"Database query failed: {e}. Disabling DB connection for session.")
        _db_available = False
        return []


def execute_one(query, params=None):
    global _db_available
    if not engine or not _db_available:
        return {}
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            row = result.fetchone()
            if row:
                return dict(row._mapping)
            return {}
    except Exception as e:
        logger.warning(f"Database single-row query failed: {e}. Disabling DB connection for session.")
        _db_available = False
        return {}