import sys
import os
import json
import shutil
import tempfile

# Mock models for main.py import
class MockDeploymentType:
    HARDHAT = "Hardhat"
    FOUNDRY = "Foundry"

# Mock the main.py dependencies or just import them if possible
# Since we are in the workspace, we can try to import
try:
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    import main
    import models
except ImportError:
    print("Could not import backend.main. Ensure you are in the project root.")
    sys.exit(1)

def test_abi_extraction():
    temp_dir = tempfile.mkdtemp()
    print(f"Created temp dir at {temp_dir}")
    
    try:
        # 1. Test Hardhat Extraction
        hardhat_dir = os.path.join(temp_dir, "hardhat_proj")
        artifacts_dir = os.path.join(hardhat_dir, "artifacts", "contracts", "Greeter.sol")
        os.makedirs(artifacts_dir)
        
        mock_abi = [{"name": "greet", "type": "function", "stateMutability": "view", "inputs": []}]
        mock_artifact = {"abi": mock_abi}
        
        with open(os.path.join(artifacts_dir, "Greeter.json"), "w") as f:
            json.dump(mock_artifact, f)
            
        extracted_abi = main.extract_abi(hardhat_dir, models.DeploymentType.HARDHAT)
        
        if extracted_abi:
            parsed = json.loads(extracted_abi)
            if parsed == mock_abi:
                print("✅ Hardhat ABI extraction passed!")
            else:
                print(f"❌ Hardhat ABI mismatch. Got: {parsed}")
        else:
            print("❌ Hardhat ABI extraction failed (returned empty)")

        # 2. Test Foundry Extraction
        foundry_dir = os.path.join(temp_dir, "foundry_proj")
        out_dir = os.path.join(foundry_dir, "out", "Greeter.sol")
        os.makedirs(out_dir)
        
        with open(os.path.join(out_dir, "Greeter.json"), "w") as f:
            json.dump(mock_artifact, f)
            
        extracted_abi = main.extract_abi(foundry_dir, models.DeploymentType.FOUNDRY)
        
        if extracted_abi:
            parsed = json.loads(extracted_abi)
            if parsed == mock_abi:
                print("✅ Foundry ABI extraction passed!")
            else:
                print(f"❌ Foundry ABI mismatch. Got: {parsed}")
        else:
            print("❌ Foundry ABI extraction failed (returned empty)")

    finally:
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    test_abi_extraction()
