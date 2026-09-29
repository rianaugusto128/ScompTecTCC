"""Carrega o .env do backend sem sobrescrever variáveis da hospedagem."""

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
