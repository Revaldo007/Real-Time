from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    about = Column(String, nullable=True, default="Hey there! I am using Rivo.")
    last_seen = Column(DateTime, nullable=True, default=datetime.utcnow)
    is_online = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    chat_memberships = relationship("ChatMember", back_populates="user", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
