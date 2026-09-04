from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=True)  # Stores the text/content
    message_type = Column(String, default="text")  # "text", "emoji", "image", "video", "document", "voice"
    reply_to = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)

    # Relationships
    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    replied_to_message = relationship("Message", remote_side=[id], foreign_keys=[reply_to])
    statuses = relationship("MessageStatus", back_populates="message", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")

class MessageStatus(Base):
    __tablename__ = "message_status"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="sent")  # "sent", "delivered", "read"
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    message = relationship("Message", back_populates="statuses")
    user = relationship("User")
