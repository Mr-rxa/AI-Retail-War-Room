from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from config import Config


DATABASE_URL = URL.create(
    drivername="postgresql+psycopg2",
    username=Config.DB_USER,
    password=Config.DB_PASSWORD,
    host=Config.DB_HOST,
    port=Config.DB_PORT,
    database=Config.DB_NAME
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


def execute_query(query, params=None):

    with engine.connect() as conn:

        result = conn.execute(text(query), params or {})

        return [dict(row._mapping) for row in result]


def execute_one(query, params=None):

    with engine.connect() as conn:

        result = conn.execute(text(query), params or {})

        row = result.fetchone()

        if row:
            return dict(row._mapping)

        return {}