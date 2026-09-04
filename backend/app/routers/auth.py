from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import UserCreate, UserResponse, Token, ForgotPassword, ResetPassword, UserLogin
from app.services import auth_service
from app.core.security import create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    return auth_service.register_user(db, user_data)

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Standard OAuth2 form-data login (e.g. for Swagger Docs UI)
    # We map form_data.username to phone_number and form_data.password to OTP
    user = auth_service.authenticate_user(db, phone_number=form_data.username, otp=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or OTP",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login/json", response_model=Token)
def login_json(credentials: UserLogin, db: Session = Depends(get_db)):
    # JSON-based login (more convenient for frontends sending JSON bodies)
    # Actually, we might need a separate OTP in UserLogin if we want it.
    # For now, just authenticate with phone_number
    user = auth_service.authenticate_user(db, phone_number=credentials.phone_number)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(data: ForgotPassword, db: Session = Depends(get_db)):
    return auth_service.handle_forgot_password(db, data.email)

@router.post("/reset-password")
def reset_password(data: ResetPassword, db: Session = Depends(get_db)):
    return auth_service.handle_reset_password(db, data.email, data.new_password)
