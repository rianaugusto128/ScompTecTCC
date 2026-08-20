import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Database.Connection import create_tables
from Services import authservice, cncservice, deviceservice, telemetry

app = FastAPI(title="SCOMPTEC - CNC Monitor", version="1.0.0")

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()


app.include_router(cncservice.router, prefix="/api")
app.include_router(deviceservice.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")
app.include_router(authservice.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
