# ─────────────────────────────────────────────────────────
# dockerfile_generator.py
# 
# Takes a DeploymentType and produces a Dockerfile string.
# This is literally one of the most important files in the project —
# it's the part that makes us a "deployment platform".
#
# We return a multi-line string (triple quotes in Python)
# that we then write to disk as a file called "Dockerfile"
# inside the user's extracted project folder.
# ─────────────────────────────────────────────────────────

from models import DeploymentType


def generate_dockerfile(deploy_type: DeploymentType) -> tuple[str, int]:
    """
    Returns (dockerfile_content, internal_container_port).
    The port is the port INSIDE the container the app listens on.
    """

    if deploy_type == DeploymentType.HARDHAT:
        # Hardhat node runs a local Ethereum blockchain on port 8545
        # Developers can then connect MetaMask or scripts to this RPC endpoint
        return (
            """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8545
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
""",
            8545
        )

    elif deploy_type == DeploymentType.FOUNDRY:
        # Anvil is Foundry's local test chain — faster than Hardhat
        # It also runs on port 8545 (same Ethereum JSON-RPC standard)
        return (
            """FROM ghcr.io/foundry-rs/foundry:latest
WORKDIR /app
COPY . .
EXPOSE 8545
CMD ["anvil", "--host", "0.0.0.0"]
""",
            8545
        )

    elif deploy_type == DeploymentType.TRUFFLE:
        # Truffle's develop command starts a local blockchain + console
        # We expose it via ganache (the underlying chain)
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
            9545
        )

    elif deploy_type == DeploymentType.WEB3_REACT:
        # Web3 React dApps use Vite or CRA — try `vite` first, fall back to react-scripts
        # The dev server exposes port 5173 (Vite default) or 3000 (CRA default)
        return (
            """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0 2>/dev/null || npm start"]
""",
            5173
        )

    elif deploy_type == DeploymentType.NODE:
        # Generic Node.js app — assume npm start on port 3000
        return (
            """FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
""",
            3000
        )

    elif deploy_type == DeploymentType.PYTHON:
        # Python app — look for app.py or main.py, install from requirements.txt
        return (
            """FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["sh", "-c", "python app.py 2>/dev/null || python main.py 2>/dev/null || uvicorn main:app --host 0.0.0.0 --port 5000"]
""",
            5000
        )

    else:
        # Static HTML — serve with http-server on port 8080
        return (
            """FROM node:18-alpine
WORKDIR /app
RUN npm install -g http-server
COPY . .
EXPOSE 8080
CMD ["http-server", "-p", "8080", "--cors"]
""",
            8080
        )
