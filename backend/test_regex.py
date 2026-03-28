import re

def test_wrap(dockerfile):
    cmd_match = re.search(r'CMD \[(.*)\]', dockerfile)
    if not cmd_match:
        return "No match"
    
    raw_cmd_str = cmd_match.group(1).replace(chr(34), "").replace(",", " ")
    orig_cmd = " ".join(raw_cmd_str.split())
    
    is_pure_node = any(nc in orig_cmd for nc in ["hardhat node", "anvil", "truffle develop"])
    return f"Match: '{orig_cmd}', is_node: {is_pure_node}"

df = 'CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]\n'
print(test_wrap(df))
