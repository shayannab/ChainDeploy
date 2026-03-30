import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from eth_account.messages import encode_defunct
from eth_account import Account
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import database
import models
\
# ── Configuration ──────────────────────────────────────────
# In production, these would be in environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "chaindeploy_super_secret_key_12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days for ease of use

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/verify", auto_error=False)

# ── SIWE Utilities ────────────────────────────────────────
def generate_nonce() -> str:
    """Creates a random 16-character hex string for the user to sign."""
    return secrets.token_hex(8)

def verify_ethereum_signature(address: str, signature: str, nonce: str) -> bool:
    """
    Verifies that the given signature was produced by 'address' 
    signing the message: 'Sign this message to authenticate with ChainDeploy: <nonce>'
    """
    message = f"Sign this message to authenticate with ChainDeploy: {nonce}"
    message_hash = encode_defunct(text=message)
    
    try:
        # Recover the address from the signature
        recovered_address = Account.recover_message(message_hash, signature=signature)
        return recovered_address.lower() == address.lower()
    except Exception:
        return False

# ── JWT Utilities ─────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ── FastAPI Dependencies ──────────────────────────────────
async def get_current_user(
    token: Optional[str] = Query(None),
    header_token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> models.User:
    actual_token = token or header_token
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not actual_token:
        raise credentials_exception

    try:
        payload = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
        address: str = payload.get("sub")
        if address is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.address == address).first()
    if user is None:
        raise credentials_exception
    return user
