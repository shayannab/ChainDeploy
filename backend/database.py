# ─────────────────────────────────────────────────────────
# database.py — Sets up the connection to PostgreSQL
#
# SQLAlchemy is an ORM (Object Relational Mapper).
# Instead of writing raw SQL like:
#   SELECT * FROM deployments WHERE id = 1;
# We write Python:
#   db.query(Deployment).filter(Deployment.id == 1).first()
#
# It translates Python → SQL for us automatically.
# ─────────────────────────────────────────────────────────

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Read the database connection string from environment variable.
# ● In Docker (production): DATABASE_URL is set in docker-compose.yml → uses PostgreSQL
# ● Locally (dev):          No env var set → falls back to SQLite (no Postgres needed!)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chaindeploy.db")

# SQLite needs check_same_thread=False; PostgreSQL ignores this kwarg via connect_args
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# The "engine" is the actual connection to the database
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# A "session" is like a conversation with the database
# We create a new session for each request, then close it when done
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class — all our database models will inherit from this
Base = declarative_base()

# ── Dependency for FastAPI routes ──────────────────────────
# This function creates a DB session, hands it to the route,
# and automatically closes it when the request is done.
def get_db():
    db = SessionLocal()
    try:
        yield db          # "yield" = give the session to whoever asked
    finally:
        db.close()        # always close, even if there's an error
