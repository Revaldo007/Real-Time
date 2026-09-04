from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse

class GroupMemberResponse(BaseModel):
    id: int
    group_id: int
    user_id: int
    role: str
    joined_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True

class GroupResponse(BaseModel):
    id: int
    chat_id: int
    name: str
    description: Optional[str] = None
    group_image: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    members: List[GroupMemberResponse] = []

    class Config:
        from_attributes = True

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    user_ids: List[int] = []  # initial member IDs to add (excluding the creator)

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    group_image: Optional[str] = None

class GroupMemberAdd(BaseModel):
    user_id: int
    role: str = "member"

class GroupMemberUpdate(BaseModel):
    role: str
