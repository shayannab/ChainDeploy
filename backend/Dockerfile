# ─────────────────────────────────────────────────────────
# Dockerfile for the FastAPI backend
#
# FROM python:3.11-slim  → start from a minimal Python image
# WORKDIR /app           → all commands run from /app inside container
# COPY requirements.txt  → copy just this file first (Docker caches layers,
#                          so we only re-install deps when this file changes)
# RUN pip install ...    → install all Python dependencies
# COPY . .               → now copy the rest of the backend code
# CMD ...                → start FastAPI with uvicorn on port 8000
# ─────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
