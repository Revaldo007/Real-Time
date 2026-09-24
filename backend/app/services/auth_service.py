from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from fastapi import HTTPException, status
from datetime import datetime

def get_user_by_phone(db: Session, phone_number: str):
    return db.query(User).filter(User.phone_number == phone_number).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def register_user(db: Session, user_data: UserCreate):
    # Check if phone number exists
    if get_user_by_phone(db, user_data.phone_number):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Ensure username is unique
    clean_phone = user_data.phone_number.replace('+', '')
    base_username = user_data.username or f"User_{clean_phone[-4:] if len(clean_phone) >= 4 else clean_phone}"
    username = base_username
    counter = 1
    while get_user_by_username(db, username):
        username = f"{base_username}_{counter}"
        counter += 1

    db_user = User(
        phone_number=user_data.phone_number,
        username=username,
        email=user_data.email
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, phone_number: str, otp: str = None):
    db_user = get_user_by_phone(db, phone_number)
    # We allow mock OTP (e.g., '123456') or any password-like entry for now.
    # In a real app, verify OTP here.
    if not db_user:
        return None
    return db_user

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def update_user_profile(db: Session, user_id: int, update_data: UserUpdate):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update_data.username is not None:
        # Check if the new username is already taken by another user
        existing = get_user_by_username(db, update_data.username)
        if existing and existing.id != user_id:
            raise HTTPException(status_code=400, detail="Username already taken")
        db_user.username = update_data.username

    if update_data.about is not None:
        db_user.about = update_data.about

    if update_data.profile_image is not None:
        db_user.profile_image = update_data.profile_image

    db.commit()
    db.refresh(db_user)
    return db_user

def handle_forgot_password(db: Session, email: str):
    db_user = get_user_by_email(db, email)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist"
        )
    # In a real app, send reset link email. Here, we mock it.
    return {"message": "Password reset instructions sent to your email"}

def handle_reset_password(db: Session, email: str, new_pwd: str):
    db_user = get_user_by_email(db, email)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist"
        )
    db_user.password_hash = get_password_hash(new_pwd)
    db.commit()
    return {"message": "Password has been reset successfully"}
