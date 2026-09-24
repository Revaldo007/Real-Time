import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/rivo"
    JWT_SECRET: str = "supersecretjwtkeyforrivochatapplicationdevelopment"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    UPLOAD_DIR: str = "uploads"

    # Resend email OTP
    RESEND_API_KEY: str = ""
    OTP_FROM_EMAIL: str = "Rivo <onboarding@resend.dev>"
    OTP_EXPIRE_MINUTES: int = 5

    # SMTP (Nodemailer-equivalent) settings - sends to ANY email worldwide
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
