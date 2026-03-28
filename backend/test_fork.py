import sys
import os

# Add the current directory to sys.path so we can import local modules
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from dockerfile_generator import generate_dockerfile
from models import DeploymentType

def test_fork_template():
    print("Testing Simulation Mode Template Generation...")
    
    # Test 1: QIE_FORK (Node-only replacement)
    dockerfile, port = generate_dockerfile(DeploymentType.QIE_FORK)
    if "anvil" in dockerfile and "rpc-main1.qiblockchain.online" in dockerfile:
        print("✅ SUCCESS: QIE Fork Template is correctly configured.")
    else:
        print("❌ FAILED: QIE Fork Template is missing critical components.")

    # Test 2: HARDHAT with fork
    dockerfile_hh, port_hh = generate_dockerfile(DeploymentType.HARDHAT, is_fork=True)
    if "node:18-slim" in dockerfile_hh and "anvil" in dockerfile_hh:
        print("✅ SUCCESS: Hardhat Simulation Mode uses 'slim' image.")
    else:
        print("❌ FAILED: Hardhat Simulation Mode image mismatch.")

    # Test 3: WEB3_REACT (Vite) with fork
    # Mocking a Vite app_dir or just checking logic
    dockerfile_web, port_web = generate_dockerfile(DeploymentType.WEB3_REACT, is_fork=True)
    if "node:18-slim" in dockerfile_web and "anvil" in dockerfile_web:
         print("✅ SUCCESS: Web App Simulation Mode uses 'slim' image.")
    else:
         print("❌ FAILED: Web App Simulation Mode image mismatch.")

if __name__ == "__main__":
    test_fork_template()
