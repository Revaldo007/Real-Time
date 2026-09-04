from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import psycopg2
from urllib.parse import urlparse
from app.core.config import settings

Base = declarative_base()

def ensure_database_exists():
    url = urlparse(settings.DATABASE_URL)
    db_name = url.path.lstrip('/')
    
    try:
        # Attempt to connect to the target database
        conn = psycopg2.connect(
            dbname=db_name,
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or 5432
        )
        conn.close()
    except psycopg2.OperationalError as e:
        # If the database doesn't exist, connect to postgres and create it
        if "does not exist" in str(e):
            try:
                conn = psycopg2.connect(
                    dbname="postgres",
                    user=url.username,
                    password=url.password,
                    host=url.hostname,
                    port=url.port or 5432
                )
                conn.autocommit = True
                cursor = conn.cursor()
                cursor.execute(f'CREATE DATABASE "{db_name}"')
                cursor.close()
                conn.close()
                print(f"Database '{db_name}' created successfully.")
            except Exception as create_err:
                print(f"Failed to create database '{db_name}': {create_err}")
        else:
            print(f"Database connection operational error: {e}")

# Ensure database exists before creating the engine
ensure_database_exists()

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Import all models to ensure they are registered with Base metadata
from app.models.user import User
from app.models.chat import Chat, ChatMember
from app.models.group import Group, GroupMember
from app.models.message import Message, MessageStatus
from app.models.attachment import Attachment

Base.metadata.create_all(bind=engine)
