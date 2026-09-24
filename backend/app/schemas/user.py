from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    phone_number: str
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class UserCreate(UserBase):
    pass

class OTPVerify(BaseModel):
    phone_number: str
    otp: str

# ── Phone and Email OTP flow ──────────────────────────────────────────────────

class CheckPhoneRequest(BaseModel):
    phone_number: str

class CheckPhoneResponse(BaseModel):
    exists: bool
    phone_number: str
    username: Optional[str] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"

class SendOTPRequest(BaseModel):
    email: EmailStr
    phone_number: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    phone_number: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────

class UserLogin(BaseModel):
    phone_number: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    about: Optional[str] = None
    profile_image: Optional[str] = None

class UserResponse(UserBase):
    id: int
    profile_image: Optional[str] = None
    about: Optional[str] = None
    last_seen: Optional[datetime] = None
    is_online: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)
