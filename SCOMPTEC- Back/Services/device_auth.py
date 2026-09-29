import os
import secrets

from fastapi import Header, HTTPException


def require_device_key(x_device_key: str = Header(default="")):
    key = os.getenv("DEVICE_API_KEY", "")
    if key and not secrets.compare_digest(key.encode(), x_device_key.encode()):
        raise HTTPException(status_code=401, detail="Chave do dispositivo inválida")
