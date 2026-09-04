from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.message import MessageResponse, MessageCreate
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import message_service
from app.websocket.chat_socket import manager
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/messages", tags=["messages"])

class MessageEdit(BaseModel):
    message: str

class MessageStatusUpdate(BaseModel):
    status: str  # "delivered" or "read"

@router.get("/{chat_id}", response_model=List[MessageResponse])
def get_history(
    chat_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return message_service.get_chat_messages(db, chat_id, limit, offset)

@router.post("/send", response_model=MessageResponse)
async def send_new_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_msg = message_service.send_message(db, current_user.id, data)
    
    # Serialize response
    msg_res = MessageResponse.model_validate(new_msg).model_dump(mode="json")
    
    # Broadcast to all chat members
    await manager.broadcast_to_chat(new_msg.chat_id, {
        "type": "message",
        "chat_id": new_msg.chat_id,
        "message": msg_res
    }, db)
    
    return new_msg

@router.put("/{message_id}", response_model=MessageResponse)
async def edit_existing_message(
    message_id: int,
    data: MessageEdit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    edited = message_service.edit_message(db, message_id, current_user.id, data.message)
    
    await manager.broadcast_to_chat(edited.chat_id, {
        "type": "message_edit",
        "chat_id": edited.chat_id,
        "message_id": edited.id,
        "message": edited.message
    }, db)
    
    return edited

@router.delete("/{message_id}")
async def delete_existing_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = message_service.delete_message(db, message_id, current_user.id)
    
    await manager.broadcast_to_chat(deleted.chat_id, {
        "type": "message_delete",
        "chat_id": deleted.chat_id,
        "message_id": deleted.id
    }, db)
    
    return {"message": "Message deleted successfully"}

@router.post("/{message_id}/status")
async def update_status(
    message_id: int,
    data: MessageStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status_entry = message_service.update_message_status(db, message_id, current_user.id, data.status)
    
    # Broadcast status change to the chat
    await manager.broadcast_to_chat(status_entry.message.chat_id, {
        "type": "message_status",
        "chat_id": status_entry.message.chat_id,
        "message_id": status_entry.message_id,
        "user_id": current_user.id,
        "status": data.status
    }, db)
    
    return {"message": "Status updated successfully"}
