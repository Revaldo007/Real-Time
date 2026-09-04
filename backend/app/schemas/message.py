from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse

class AttachmentResponse(BaseModel):
    id: int
    file_path: str
    file_name: str
    file_type: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True

class MessageStatusResponse(BaseModel):
    id: int
    message_id: int
    user_id: int
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    chat_id: int
    message: Optional[str] = None
    message_type: str = "text"  # "text", "emoji", "image", "video", "document", "voice"
    reply_to: Optional[int] = None

class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    message: Optional[str] = None
    message_type: str
    reply_to: Optional[int] = None
    created_at: datetime
    edited_at: Optional[datetime] = None
    is_deleted: bool
    sender: UserResponse
    attachments: List[AttachmentResponse] = []
    statuses: List[MessageStatusResponse] = []

    class Config:
        from_attributes = True
