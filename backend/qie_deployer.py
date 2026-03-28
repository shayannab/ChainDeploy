import os
import subprocess
import re
import shutil

from models import DeploymentType

def deploy_to_qie(app_dir: str, project_name: str, deploy_type: DeploymentType = DeploymentType.HARDHAT) -> tuple[bool, str]:
    """
    1. Validates deployer key
    2. Injects QIE Mainnet network into hardhat.config.js (for Hardhat)
    3. Runs a standardized deployment script or command
    4. Returns (True, address) or (False, error)
    """
    deployer_key = os.getenv("MASTER_DEPLOYER_KEY", "").strip()
    if not deployer_key:
        return False, "Deployment Failed: MASTER_DEPLOYER_KEY is not set in environment variables."

    if deploy_type == DeploymentType.HARDHAT:
        config_path = os.path.join(app_dir, "hardhat.config.js")
        if not os.path.exists(config_path):
            ts_path = os.path.join(app_dir, "hardhat.config.ts")
            if os.path.exists(ts_path):
                config_path = ts_path
            else:
                return False, "hardhat.config.js/ts not found"

    # ── Step 0: Ensure package.json exists ──
    pkg_path = os.path.join(app_dir, "package.json")
    if not os.path.exists(pkg_path):
        minimal_pkg = {
            "name": project_name.lower().replace(" ", "-"),
            "version": "1.0.0",
            "devDependencies": {
                "hardhat": "^2.19.0",
                "@nomicfoundation/hardhat-toolbox": "^4.0.0"
            }
        }
        import json
        with open(pkg_path, "w", encoding="utf-8") as f:
            json.dump(minimal_pkg, f, indent=2)
        
        # Install dependencies
        subprocess.run(["npm", "install"], cwd=app_dir, shell=True, capture_output=True)

    if deploy_type == DeploymentType.HARDHAT:
        # ── Step A: Inject QIE Network ──
        # We use a robust polyfill that works in both JS and compiled TS (CJS)
        qie_network = """
// --- ChainDeploy Auto-Injected QIE Config ---
(function() {
  const target = (typeof module !== 'undefined' && module.exports) ? module.exports : (typeof exports !== 'undefined' ? exports : null);
  if (target) {
    if (!target.networks) target.networks = {};
    target.networks.qie = {
      url: "https://rpc-main1.qiblockchain.online",
      chainId: 5656,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    };
  }
})();
// --------------------------------------------
"""
        try:
            with open(config_path, "a", encoding="utf-8") as f:
                f.write(qie_network)
        except Exception as e:
            return False, f"Config injection failed: {str(e)}"

    # ── Step B: Run Deployment ──
    if deploy_type == DeploymentType.HARDHAT:
        script_path = os.path.join(app_dir, "scripts", "deploy.js")
        if not os.path.exists(script_path):
            scripts_dir = os.path.join(app_dir, "scripts")
            if os.path.exists(scripts_dir):
                scripts = sorted([s for s in os.listdir(scripts_dir) if s.endswith(".js") or s.endswith(".ts")])
                if scripts:
                    script_path = os.path.join(scripts_dir, scripts[0])
                else:
                    return False, "No deployment script found in scripts/ folder"
            else:
                return False, "scripts/ folder not found"

        env = {**os.environ, "PRIVATE_KEY": deployer_key, "HARDHAT_DISABLE_TELEMETRY": "true"}
        result = subprocess.run(
            ["npx", "--yes", "hardhat", "run", script_path, "--network", "qie"],
            cwd=app_dir,
            capture_output=True,
            text=True,
            shell=True,
            env=env
        )
    elif deploy_type == DeploymentType.FOUNDRY:
        # For Foundry, we look for any .sol in src/
        src_dir = os.path.join(app_dir, "src")
        if not os.path.exists(src_dir):
            return False, "Foundry project missing src/ directory"
        
        contracts = [c for c in os.listdir(src_dir) if c.endswith(".sol")]
        if not contracts:
            return False, "No .sol contracts found in src/"
        
        contract_to_deploy = contracts[0] # Simplest fallback
        
        # Foundry 'forge create' requires the contract name
        contract_name = contract_to_deploy.replace(".sol", "")
        
        result = subprocess.run(
            ["forge", "create", f"src/{contract_to_deploy}:{contract_name}", 
             "--rpc-url", "https://rpc-main1.qiblockchain.online",
             "--private-key", deployer_key,
             "--legacy"], # QIE often prefers legacy transactions
            cwd=app_dir,
            capture_output=True,
            text=True
        )
    else:
        return False, f"Deployment not supported for {deploy_type}"

    if result.returncode != 0:
        return False, result.stderr or result.stdout

    # ── Step C: Parse Address ──
    output = result.stdout
    matches = re.findall(r"0x[a-fA-F0-9]{40}", output)
    if matches:
        return True, matches[-1]
    
    return True, "Contract deployed (check explorer)"
