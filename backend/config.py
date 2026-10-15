import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "helpdesk360-super-secret-key-hackathon-2026")
    DATABASE_PATH = os.environ.get("DATABASE_PATH", str(BASE_DIR / "helpdesk.db"))
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", 24))
