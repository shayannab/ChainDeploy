import requests
import json

rpcs = [
    "https://rpc-main1.qiblockchain.online/",
    "https://rpc-main2.qiblockchain.online/",
    "https://5656.rpc.thirdweb.com",
    "https://rpc.qie.exchange"
]

def check_rpc(url):
    print(f"Checking {url}...")
    try:
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_chainId",
            "params": [],
            "id": 1
        }
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            chain_id = int(response.json()['result'], 16)
            
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 2
            }
            res_block = requests.post(url, json=payload, timeout=5)
            block_num = int(res_block.json()['result'], 16)
            
            print(f"SUCCESS: Chain ID: {chain_id}, Block: {block_num}")
            return True
        else:
            print(f"FAILED: Status {response.status_code}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
    return False

for rpc in rpcs:
    check_rpc(rpc)
