from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.message import Message, MessageStatus
from app.models.chat import Chat, ChatMember
from app.models.group import Group, GroupMember
from app.models.attachment import Attachment
from app.schemas.message import MessageCreate
from fastapi import HTTPException
from datetime import datetime

def send_message(db: Session, sender_id: int, msg_data: MessageCreate):
    # Ensure chat exists
    chat = db.query(Chat).filter(Chat.id == msg_data.chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    # Check if sender is in the chat
    is_member = False
    recipients = []
    
    if chat.type == "one_to_one":
        members = db.query(ChatMember).filter(ChatMember.chat_id == chat.id).all()
        for m in members:
            if m.user_id == sender_id:
                is_member = True
            else:
                recipients.append(m.user_id)
    else:
        # Group chat
        group = db.query(Group).filter(Group.chat_id == chat.id).first()
        if group:
            members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
            for m in members:
                if m.user_id == sender_id:
                    is_member = True
                else:
                    recipients.append(m.user_id)
                    
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this chat")
        
    # Create the message
    new_msg = Message(
        chat_id=msg_data.chat_id,
        sender_id=sender_id,
        message=msg_data.message,
        message_type=msg_data.message_type,
        reply_to=msg_data.reply_to
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    
    # Create message statuses for all recipients
    for r_id in recipients:
        status_entry = MessageStatus(
            message_id=new_msg.id,
            user_id=r_id,
            status="sent",
            timestamp=datetime.utcnow()
        )
        db.add(status_entry)
        
    # Update chat timestamp
    chat.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_msg)
    return new_msg

def get_chat_messages(db: Session, chat_id: int, limit: int = 50, offset: int = 0):
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).offset(offset).limit(limit).all()

def update_message_status(db: Session, message_id: int, user_id: int, status: str):
    # Find existing status for this message and user
    status_entry = db.query(MessageStatus).filter(
        and_(MessageStatus.message_id == message_id, MessageStatus.user_id == user_id)
    ).first()
    
    if not status_entry:
        status_entry = MessageStatus(
            message_id=message_id,
            user_id=user_id,
            status=status,
            timestamp=datetime.utcnow()
        )
        db.add(status_entry)
    else:
        # Only upgrade status (sent -> delivered -> read)
        status_order = {"sent": 1, "delivered": 2, "read": 3}
        current_order = status_order.get(status_entry.status, 0)
        new_order = status_order.get(status, 0)
        
        if new_order > current_order:
            status_entry.status = status
            status_entry.timestamp = datetime.utcnow()
            
    db.commit()
    return status_entry

def edit_message(db: Session, message_id: int, sender_id: int, new_content: str):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.sender_id != sender_id:
        raise HTTPException(status_code=403, detail="Cannot edit someone else's message")
        
    msg.message = new_content
    msg.edited_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    return msg

def delete_message(db: Session, message_id: int, sender_id: int):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.sender_id != sender_id:
        raise HTTPException(status_code=403, detail="Cannot delete someone else's message")
        
    msg.is_deleted = True
    msg.message = "This message was deleted"
    db.commit()
    db.refresh(msg)
    return msg

def add_message_attachment(db: Session, message_id: int, file_path: str, file_name: str, file_type: str, file_size: int):
    attachment = Attachment(
        message_id=message_id,
        file_path=file_path,
        file_name=file_name,
        file_type=file_type,
        file_size=file_size
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment
