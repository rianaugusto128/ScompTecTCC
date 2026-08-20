import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from Database.models import Base

# Exemplo: mysql+pymysql://root:SUA_SENHA@127.0.0.1:3306/cnc_monitor
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:@127.0.0.1:3306/cnc_monitor?charset=utf8mb4",
)

engine = create_engine(DATABASE_URL, echo=os.getenv("SQL_ECHO", "false").lower() == "true", pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
