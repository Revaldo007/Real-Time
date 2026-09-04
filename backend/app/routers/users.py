from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import auth_service
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = Query("", min_length=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find all users matching username, email, or phone number, excluding current user
    if not q or not q.strip():
        return db.query(User).filter(User.id != current_user.id).limit(50).all()
    
    results = db.query(User).filter(
        User.id != current_user.id,
        (User.username.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")) | (User.phone_number.ilike(f"%{q}%"))
    ).limit(50).all()
    return results

@router.put("/profile", response_model=UserResponse)
def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auth_service.update_user_profile(db, current_user.id, update_data)
