from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.chat import ChatResponse, ChatCreate
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import chat_service
from typing import List

router = APIRouter(prefix="/chats", tags=["chats"])

@router.get("", response_model=List[ChatResponse])
def list_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return chat_service.get_user_chats(db, current_user.id)

@router.post("/create", response_model=ChatResponse)
def create_chat(
    data: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.type == "one_to_one":
        if not data.contact_id:
            raise HTTPException(status_code=400, detail="contact_id is required for one_to_one chat")
        chat = chat_service.create_one_to_one_chat(db, current_user.id, data.contact_id)
    elif data.type == "group":
        if not data.group_name:
            raise HTTPException(status_code=400, detail="group_name is required for group chat")
        from app.schemas.group import GroupCreate
        group_data = GroupCreate(
            name=data.group_name,
            description=data.group_description,
            user_ids=[data.contact_id] if data.contact_id else []
        )
        chat = chat_service.create_group_chat(db, current_user.id, group_data)
    else:
        raise HTTPException(status_code=400, detail="Invalid chat type")
        
    # Enrich and return the newly created chat
    chats = chat_service.get_user_chats(db, current_user.id)
    for c in chats:
        if c["id"] == chat.id:
            return c
            
    raise HTTPException(status_code=500, detail="Failed to retrieve created chat")

@router.delete("/{chat_id}")
def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return chat_service.delete_chat_for_user(db, chat_id, current_user.id)

