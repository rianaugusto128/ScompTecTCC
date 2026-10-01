import os

import config  # Carrega o .env antes de importar banco e serviços.

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from Database.Connection import create_tables, get_db, SessionLocal
from Services.admin_bootstrap import sync_admin
from Services import authservice, cncservice, deviceservice, telemetry, adminservice

app = FastAPI(title="SCOMPTEC - CNC Monitor", version="1.0.0")

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["scomptec://app", *[origin.strip() for origin in allowed_origins if origin.strip()]],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()
    with SessionLocal() as db:
        sync_admin(db)


app.include_router(cncservice.router, prefix="/api")
app.include_router(deviceservice.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")
app.include_router(authservice.router, prefix="/api")
app.include_router(adminservice.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")
    return {"status": "ok", "database": "ok"}
