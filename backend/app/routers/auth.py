from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import (
    UserCreate, UserResponse, Token,
    ForgotPassword, ResetPassword, UserLogin,
    SendOTPRequest, VerifyOTPRequest,
    CheckPhoneRequest, CheckPhoneResponse
)
from app.services import auth_service
from app.services import otp_service
from app.core.security import create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Phone and Email OTP endpoints ──────────────────────────────────────────────

@router.post("/check-phone", response_model=CheckPhoneResponse)
def check_phone(data: CheckPhoneRequest, db: Session = Depends(get_db)):
    """
    Check if a phone number already exists in the database.
    - Returning user: Generates and returns JWT access_token immediately (no OTP needed).
    - New user: Returns exists=False so frontend can prompt for email and OTP.
    """
    user = auth_service.get_user_by_phone(db, data.phone_number)
    if user:
        access_token = create_access_token(data={"sub": str(user.id)})
        return CheckPhoneResponse(
            exists=True,
            phone_number=user.phone_number,
            username=user.username,
            access_token=access_token,
            token_type="bearer"
        )
    return CheckPhoneResponse(
        exists=False,
        phone_number=data.phone_number
    )


@router.post("/send-otp")
def send_otp(data: SendOTPRequest, db: Session = Depends(get_db)):
    """
    Send a 6-digit OTP to the provided email via Resend.
    Rate limited to 3 requests per 10 minutes per email.
    """
    success, message, code = otp_service.send_otp_email(data.email)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if "Too many" in message
                else status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=message
        )
    return {
        "message": message or "OTP sent to your email. It expires in 5 minutes.",
        "otp_hint": code
    }


@router.post("/verify-otp", response_model=Token)
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verify the OTP for the given email.
    On success, creates or updates the user associated with phone_number & email,
    and returns a JWT access token.
    """
    ok, reason = otp_service.verify_otp(data.email, data.otp)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    user = None
    if data.phone_number:
        user = auth_service.get_user_by_phone(db, data.phone_number)

    if not user:
        user = auth_service.get_user_by_email(db, data.email)

    if not user:
        # Register new user with the given phone number and email
        phone = data.phone_number if data.phone_number else f"email_{data.email.replace('@', '_').replace('.', '_')}"
        user_data = UserCreate(
            phone_number=phone,
            email=data.email,
            username=None,
        )
        user = auth_service.register_user(db, user_data)
    else:
        # Link email if not already present
        if not user.email:
            user.email = data.email
            db.commit()
            db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


# ── Legacy endpoints (kept for backwards compatibility) ───────────────────────

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
