import re

def test_parsing():
    mock_output = """
    Compiled 1 Solidity file successfully
    Deploying contracts with the account: 0x1234567890123456789012345678901234567890
    Account balance: 1000000000000000000
    Token address: 0x6e68466c4a465d-a5b9-bb6c351f8c92 (not this)
    Contract deployed to: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
    """
    
    matches = re.findall(r"0x[a-fA-F0-9]{40}", mock_output)
    if matches:
        address = matches[-1]
        print(f"✅ Success! Parsed address: {address}")
        if address == "0x742d35Cc6634C0532925a3b844Bc454e4438f44e":
            print("✅ Accurate: Matched the final contract address.")
    else:
        print("❌ Failed to parse address.")

if __name__ == "__main__":
    test_parsing()
