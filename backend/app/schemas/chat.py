from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse

class ChatMemberResponse(BaseModel):
    id: int
    chat_id: int
    user_id: int
    joined_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True

class GroupDetailsSchema(BaseModel):
    name: str
    description: Optional[str] = None
    group_image: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: int
    type: str  # "one_to_one" or "group"
    created_at: datetime
    updated_at: datetime
    members: List[ChatMemberResponse] = []
    group_details: Optional[GroupDetailsSchema] = None
    last_message: Optional[dict] = None  # Will hold a serialized message to avoid circular dependency issues

    class Config:
        from_attributes = True

class ChatCreate(BaseModel):
    type: str  # "one_to_one" or "group"
    contact_id: Optional[int] = None  # for one_to_one
    group_name: Optional[str] = None  # for group
    group_description: Optional[str] = None  # for group
