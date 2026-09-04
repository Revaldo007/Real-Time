from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.group import GroupCreate, GroupUpdate, GroupMemberAdd
from app.schemas.chat import ChatResponse
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import chat_service

router = APIRouter(prefix="/groups", tags=["groups"])

@router.post("/create", response_model=ChatResponse)
def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = chat_service.create_group_chat(db, current_user.id, data)
    chats = chat_service.get_user_chats(db, current_user.id)
    for c in chats:
        if c["id"] == chat.id:
            return c
    raise HTTPException(status_code=500, detail="Failed to retrieve created group chat")

@router.put("/{chat_id}/details")
def update_group_details(
    chat_id: int,
    data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat_service.update_group_details(db, chat_id, current_user.id, data)
    return {"message": "Group details updated successfully"}

@router.post("/{chat_id}/members/add")
def add_member(
    chat_id: int,
    data: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return chat_service.add_member_to_group(db, chat_id, current_user.id, data.user_id)

@router.post("/{chat_id}/members/remove/{user_id}")
def remove_member(
    chat_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return chat_service.remove_member_from_group(db, chat_id, current_user.id, user_id)
