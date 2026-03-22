# ─────────────────────────────────────────────────────────
# detector.py — Figures out what type of project was uploaded
#
# This is the "smart" part of the system.
# It looks at the files inside the extracted ZIP and
# returns which type of project it is.
#
# Priority order:
#   1. hardhat.config.js/ts  → Hardhat (Web3)
#   2. foundry.toml           → Foundry (Web3)
#   3. truffle-config.js      → Truffle (Web3)
#   4. package.json + ethers/wagmi/viem → Web3 React dApp
#   5. package.json (generic) → Node.js
#   6. requirements.txt       → Python
#   7. index.html             → Static HTML
#   8. Unknown
# ─────────────────────────────────────────────────────────

import os
import json
from models import DeploymentType


def detect_project_type(app_dir: str) -> DeploymentType:
    """
    Inspect the extracted project folder and return the DeploymentType.
    
    app_dir: the path to the extracted project, e.g. /tmp/deployments/app-5/
    """

    # os.path.join builds a file path in a cross-platform way
    # e.g. os.path.join("/tmp/app", "package.json") → "/tmp/app/package.json"
    # os.path.exists checks if that file actually exists

    # ── Check 1: Hardhat ────────────────────────────────
    if (os.path.exists(os.path.join(app_dir, "hardhat.config.js")) or
            os.path.exists(os.path.join(app_dir, "hardhat.config.ts"))):
        return DeploymentType.HARDHAT

    # ── Check 2: Foundry ────────────────────────────────
    if os.path.exists(os.path.join(app_dir, "foundry.toml")):
        return DeploymentType.FOUNDRY

    # ── Check 3: Truffle ────────────────────────────────
    if os.path.exists(os.path.join(app_dir, "truffle-config.js")):
        return DeploymentType.TRUFFLE

    # ── Check 4: Web3 React dApp ────────────────────────
    # If there's a package.json AND it lists ethers.js, wagmi, or viem
    # as dependencies, it's a Web3 React frontend
    pkg_path = os.path.join(app_dir, "package.json")
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path, "r") as f:
                pkg = json.load(f)   # parse JSON into a Python dict

            # .get() safely reads a key, returning {} if it doesn't exist
            deps = {
                **pkg.get("dependencies", {}),
                **pkg.get("devDependencies", {})
            }

            web3_libs = ["ethers", "wagmi", "viem", "web3", "@web3-react/core"]
            if any(lib in deps for lib in web3_libs):
                return DeploymentType.WEB3_REACT

        except (json.JSONDecodeError, IOError):
            pass  # if package.json is malformed, skip this check

        # ── Check 5: Generic Node.js ────────────────────
        return DeploymentType.NODE

    # ── Check 6: Python ─────────────────────────────────
    if os.path.exists(os.path.join(app_dir, "requirements.txt")):
        return DeploymentType.PYTHON

    # ── Check 7: Static HTML ────────────────────────────
    if os.path.exists(os.path.join(app_dir, "index.html")):
        return DeploymentType.STATIC

    # ── Fallback ─────────────────────────────────────────
    return DeploymentType.STATIC
