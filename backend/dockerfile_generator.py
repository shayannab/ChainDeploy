# ─────────────────────────────────────────────────────────
# dockerfile_generator.py
#
# Generates a Dockerfile string based on the project type.
# Now accepts `app_dir` so it can inspect package.json and
# produce framework-aware, multi-stage Dockerfiles for:
#   • Next.js          → build → next start
#   • Vite / React     → build → serve dist/
#   • CRA              → build → serve build/
#   • Generic Node     → optional build → npm start
#   • Hardhat / Foundry / Truffle → unchanged
#   • Python           → pip install → run app
#   • Static HTML      → http-server
# ─────────────────────────────────────────────────────────

import os
import json

from models import DeploymentType


# ── Helpers ───────────────────────────────────────────────

def _read_pkg(app_dir: str) -> dict:
    """Safely read and return the parsed package.json, or {}."""
    if not app_dir:
        return {}
    try:
        with open(os.path.join(app_dir, "package.json")) as f:
            return json.load(f)
    except Exception:
        return {}


def _has_dep(pkg: dict, *names) -> bool:
    """True if any of `names` appear in dependencies or devDependencies."""
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    return any(n in deps for n in names)


def _has_script(pkg: dict, script: str) -> bool:
    """True if package.json defines the given npm script."""
    return script in pkg.get("scripts", {})


# ── Main function ─────────────────────────────────────────

def generate_dockerfile(deploy_type: DeploymentType, app_dir: str = None) -> tuple[str, int]:
    """
    Returns (dockerfile_content, container_port).

    app_dir  — path to the extracted project folder (used to inspect package.json).
               Passing None falls back to the old generic behaviour.
    """

    pkg = _read_pkg(app_dir)

    # ── Hardhat ───────────────────────────────────────────
    if deploy_type == DeploymentType.HARDHAT:
        return (
            """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8545
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
""",
            8545,
        )

    # ── Foundry ───────────────────────────────────────────
    elif deploy_type == DeploymentType.FOUNDRY:
        return (
            """FROM ghcr.io/foundry-rs/foundry:latest
WORKDIR /app
COPY . .
EXPOSE 8545
CMD ["anvil", "--host", "0.0.0.0"]
""",
            8545,
        )

    # ── Truffle ───────────────────────────────────────────
    elif deploy_type == DeploymentType.TRUFFLE:
        return (
            """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g truffle
RUN npm install
COPY . .
EXPOSE 9545
CMD ["sh", "-c", "truffle develop 2>&1"]
""",
            9545,
        )

    # ── Node.js / Web3 React ──────────────────────────────
    # Both share the same logic — we inspect package.json to decide.
    elif deploy_type in (DeploymentType.NODE, DeploymentType.WEB3_REACT):

        is_nextjs    = _has_dep(pkg, "next")
        is_vite      = _has_dep(pkg, "vite")
        is_cra       = _has_dep(pkg, "react-scripts")
        has_build    = _has_script(pkg, "build")
        has_start    = _has_script(pkg, "start")

        # ── Next.js ───────────────────────────────────────
        if is_nextjs:
            return (
                """FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build the Next.js app
COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
""",
                3000,
            )

        # ── Vite (React / Vue / Svelte / Web3 dApp) ───────
        elif is_vite:
            return (
                """FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
""",
                3000,
            )

        # ── Create React App ───────────────────────────────
        elif is_cra:
            return (
                """FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
""",
                3000,
            )

        # ── Generic Node with build + start scripts ────────
        elif has_build and has_start:
            return (
                """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Run the build step (compiles TS, bundles, etc.)
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
""",
                3000,
            )

        # ── Pure Node server (no build step) ──────────────
        else:
            return (
                """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
""",
                3000,
            )

    # ── Python ────────────────────────────────────────────
    elif deploy_type == DeploymentType.PYTHON:
        return (
            """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
# Try Flask-style app.py, then FastAPI main.py, then uvicorn as last resort
CMD ["sh", "-c", "python app.py 2>/dev/null || python main.py 2>/dev/null || uvicorn main:app --host 0.0.0.0 --port 5000"]
""",
            5000,
        )

    # ── Static HTML ───────────────────────────────────────
    else:
        return (
            """FROM node:18-alpine
WORKDIR /app
RUN npm install -g http-server
COPY . .
EXPOSE 8080
CMD ["http-server", "-p", "8080", "--cors"]
""",
            8080,
        )
