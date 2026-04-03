import sqlite3
import os

db_path = "c:\\Users\\shaya\\OneDrive\\Desktop\\hq\\Vercel\\backend\\chaindeploy.db" # Check name in main.py/database.py

def migrate():
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}. No migration needed.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Checking for rpc_port column...")
        cursor.execute("SELECT rpc_port FROM deployments LIMIT 1")
        print("Column 'rpc_port' already exists.")
    except sqlite3.OperationalError:
        print("Adding column 'rpc_port' to 'deployments' table...")
        cursor.execute("ALTER TABLE deployments ADD COLUMN rpc_port INTEGER")
        conn.commit()
        print("Migration successful!")
    try:
        print("Checking for contract_address column...")
        cursor.execute("SELECT contract_address FROM deployments LIMIT 1")
        print("Column 'contract_address' already exists.")
    except sqlite3.OperationalError:
        print("Adding column 'contract_address' to 'deployments' table...")
        cursor.execute("ALTER TABLE deployments ADD COLUMN contract_address TEXT")
        conn.commit()
        print("Migration successful (contract_address)!")
    except sqlite3.OperationalError:
        pass
        
    try:
        print("Checking for abi column...")
        cursor.execute("SELECT abi FROM deployments LIMIT 1")
        print("Column 'abi' already exists.")
    except sqlite3.OperationalError:
        print("Adding column 'abi' to 'deployments' table...")
        cursor.execute("ALTER TABLE deployments ADD COLUMN abi TEXT")
        conn.commit()
        print("Migration successful (abi)!")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
