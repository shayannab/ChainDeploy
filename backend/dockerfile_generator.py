# ─────────────────────────────────────────────────────────
# dockerfile_generator.py
#
# Generates a Dockerfile string based on the project type.
# THE ABSOLUTE FINAL POLISH: Double quotes for Address expansion.
# ─────────────────────────────────────────────────────────

import os
import json
import re
import base64

from models import DeploymentType


# ── Helpers ───────────────────────────────────────────────

def _wrap_with_fork(dockerfile: str, container_port: int, deploy_type: DeploymentType, has_frontend: bool = False) -> tuple[str, int]:
    """
    Wraps a Dockerfile with Anvil fork capabilities.
    Uses Double Quotes for the HTML echo so the contract ADDR is filled in.
    """
    cmd_match = re.search(r'CMD \[(.*)\]', dockerfile)
    if not cmd_match:
        return dockerfile, container_port
    
    raw_cmd_str = cmd_match.group(1).replace(chr(34), "").replace(",", " ")
    orig_cmd = " ".join(raw_cmd_str.split()) 
    
    is_pure_node = any(nc in orig_cmd for nc in ["hardhat node", "anvil", "truffle develop"])
    new_port = 8080 if (is_pure_node or deploy_type in (DeploymentType.HARDHAT, DeploymentType.FOUNDRY)) else container_port

    # ── Script Building (Plain Text) ──
    script_lines = [
        "#!/bin/sh",
        "echo '🚀 Starting Anvil Fork...'",
        "anvil --host 0.0.0.0 --fork-url https://rpc-main1.qiblockchain.online --port 8545 &",
        "sleep 5",
    ]

    if new_port == 8080:
        # Note: We use Double Quotes (") for the outer echo so that ${ADDR} is expanded
        # We must escape the double quotes inside the HTML correctly.
        html_content = (
            '<html><body style=\"background:#0a0a0c;color:#fff;text-align:center;padding:10vh;font-family:sans-serif;\">'
            '<div style=\"background:#111;padding:40px;border-radius:20px;border:1px solid #333;display:inline-block;box-shadow:0 10px 30px rgba(0,0,0,0.5);\">'
            '<h1 style=\"color:#1db954;\">🚀 Simulation Ready</h1>'
            '<p>Status: <span style=\"color:#00ff00;\">LIVE</span></p>'
            '<p style=\"font-family:monospace;color:#00ffd0;background:#222;padding:6px 10px;border-radius:6px;\">${ADDR:-Not found}</p>'
            '<p style=\"opacity:0.6;margin-top:20px;\"><small>Code successful on QIE Fork.</small></p>'
            '</div></body></html>'
        )
        script_lines += [
            "echo '📦 Deploying Contracts...'",
            "(npx hardhat run scripts/*.js --network localhost > log 2>&1 || echo 'No scripts' > log)",
            "ADDR=$(grep -oE '0x[a-fA-F0-9]{40}' log | tail -n 1)",
            f"echo \"{html_content}\" > /app/index.html",
            "echo '📡 Starting Simulation Dashboard...'",
            "npx -y http-server . -p 8080 -c-1"
        ]
    else:
        script_lines += [
            f"echo '🌐 Starting Hybrid App: {orig_cmd}'",
            orig_cmd
        ]

    # ── BASE64 ENCODING ──
    full_script = "\n".join(script_lines)
    b64_script = base64.b64encode(full_script.encode('utf-8')).decode('utf-8')
    
    layer = (
        "COPY --from=ghcr.io/foundry-rs/foundry:latest /usr/local/bin/anvil /usr/local/bin/anvil\n"
        "ENTRYPOINT []\n"
        f"RUN printf \"{b64_script}\" | base64 -d > /sim.sh && chmod +x /sim.sh\n"
    )
    
    if "EXPOSE" in dockerfile:
        new_df = dockerfile.replace("EXPOSE", f"{layer}EXPOSE")
    else:
        new_df = dockerfile.replace("CMD", f"{layer}CMD")
        
    new_df = re.sub(r'CMD \[.*\]', 'CMD ["sh", "/sim.sh"]', new_df)

    if "EXPOSE" in new_df:
        if "8545" not in new_df:
            new_df = new_df.replace("EXPOSE ", f"EXPOSE 8545\nEXPOSE ")
        if str(new_port) not in new_df:
            new_df = new_df.replace("EXPOSE ", f"EXPOSE {new_port}\nEXPOSE ")
            
    return new_df, new_port


def _read_pkg(app_dir: str) -> dict:
    if not app_dir: return {}
    try:
        with open(os.path.join(app_dir, "package.json")) as f:
            return json.load(f)
    except: return {}

def _has_dep(pkg, *names):
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    return any(n in deps for n in names)


# ── Main function ─────────────────────────────────────────

def generate_dockerfile(deploy_type: DeploymentType, app_dir: str = None, is_fork: bool = False) -> tuple[str, int]:
    pkg = _read_pkg(app_dir)
    
    # Hybrid Check
    has_frontend = False
    if app_dir:
        if os.path.exists(os.path.join(app_dir, "index.html")) or os.path.exists(os.path.join(app_dir, "public", "index.html")):
            has_frontend = True
        if _has_dep(pkg, "next", "vite", "react-scripts"):
            has_frontend = True

    # ── Hardhat ───────────────────────────────────────────
    if deploy_type == DeploymentType.HARDHAT:
        base_img = "node:18-slim" if is_fork else "node:18-alpine"
        dockerfile, port = (f"FROM {base_img}\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 8545\nCMD [\"npx\", \"hardhat\", \"node\", \"--hostname\", \"0.0.0.0\"]", 8545)

    # ── Foundry ───────────────────────────────────────────
    elif deploy_type == DeploymentType.FOUNDRY:
        dockerfile, port = ("FROM ghcr.io/foundry-rs/foundry:latest\nWORKDIR /app\nCOPY . .\nEXPOSE 8545\nCMD [\"anvil\", \"--host\", \"0.0.0.0\"]", 8545)

    # ── Truffle ───────────────────────────────────────────
    elif deploy_type == DeploymentType.TRUFFLE:
        base_img = "node:18-slim" if is_fork else "node:18-alpine"
        dockerfile, port = (f"FROM {base_img}\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install -g truffle\nCOPY . .\nEXPOSE 9545\nCMD [\"sh\", \"-c\", \"truffle develop\"]", 9545)

    # ── Node.js / Web3 ────────────────────────────────────
    elif deploy_type in (DeploymentType.NODE, DeploymentType.WEB3_REACT):
        base_img = "node:18-slim" if is_fork else "node:18-alpine"
        is_next = _has_dep(pkg, "next")
        is_vite = _has_dep(pkg, "vite")
        
        if is_next:
            dockerfile, port = (f"FROM {base_img}\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nEXPOSE 3000\nCMD [\"npm\", \"start\"]", 3000)
        elif is_vite:
            dockerfile, port = (f"FROM {base_img} AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nFROM {base_img}\nWORKDIR /app\nRUN npm install -g serve\nCOPY --from=builder /app/dist ./dist\nEXPOSE 3000\nCMD [\"serve\", \"-s\", \"dist\", \"-l\", \"3000\"]", 3000)
        else:
            dockerfile, port = (f"FROM {base_img}\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD [\"npm\", \"start\"]", 3000)

    # ── Python ────────────────────────────────────────────
    elif deploy_type == DeploymentType.PYTHON:
        dockerfile, port = ("FROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt 2>/dev/null || true\nEXPOSE 5000\nCMD [\"python\", \"main.py\"]", 5000)

    # ── Static ────────────────────────────────────────────
    else:
        base_img = "node:18-slim" if is_fork else "node:18-alpine"
        dockerfile, port = (f"FROM {base_img}\nWORKDIR /app\nRUN npm install -g http-server\nCOPY . .\nEXPOSE 8080\nCMD [\"http-server\", \"-p\", \"8080\", \"--cors\"]", 8080)

    # ── Wrap ──────────────────────────────────────────────
    if is_fork:
        dockerfile, port = _wrap_with_fork(dockerfile, port, deploy_type, has_frontend)

    return dockerfile, port
