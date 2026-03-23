# ─────────────────────────────────────────────────────────
# ChainDeploy Backend Dockerfile
#
# This Dockerfile builds the API server. 
# Crucially, we install the 'docker' CLI so the API can
# command the host's Docker engine to run user projects.
# ─────────────────────────────────────────────────────────

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose the API port
EXPOSE 8000

# Run the app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
