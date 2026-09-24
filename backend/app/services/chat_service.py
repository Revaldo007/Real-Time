from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from app.models.chat import Chat, ChatMember
from app.models.group import Group, GroupMember
from app.models.user import User
from app.models.message import Message, MessageStatus
from app.schemas.chat import ChatCreate
from app.schemas.group import GroupCreate, GroupUpdate
from fastapi import HTTPException, status
from datetime import datetime

def get_last_message_dict(db: Session, chat_id: int):
    msg = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.desc()).first()
    if not msg:
        return None
    return {
        "id": msg.id,
        "chat_id": msg.chat_id,
        "sender_id": msg.sender_id,
        "message": msg.message,
        "message_type": msg.message_type,
        "reply_to": msg.reply_to,
        "created_at": msg.created_at.isoformat(),
        "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
        "is_deleted": msg.is_deleted,
        "sender": {
            "id": msg.sender.id,
            "username": msg.sender.username,
            "email": msg.sender.email,
            "profile_image": msg.sender.profile_image,
            "about": msg.sender.about,
            "is_online": msg.sender.is_online,
            "last_seen": msg.sender.last_seen.isoformat() if msg.sender.last_seen else None,
            "created_at": msg.sender.created_at.isoformat()
        }
    }

def get_user_chats(db: Session, user_id: int):
    # Fetch direct chats where user is member
    direct_chats = db.query(Chat).join(ChatMember).filter(ChatMember.user_id == user_id).all()
    
    # Fetch group chats where user is group member
    group_chats = db.query(Chat).join(Group).join(GroupMember).filter(GroupMember.user_id == user_id).all()
    
    # Combine and remove duplicates
    all_chats = list(set(direct_chats + group_chats))
    
    # Sort by updated_at descending
    all_chats.sort(key=lambda c: c.updated_at or c.created_at, reverse=True)
    
    # Enrich and serialize
    chats_responses = []
    for chat in all_chats:
        chat_dict = {
            "id": chat.id,
            "type": chat.type,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at,
            "members": [],
            "group_details": None,
            "last_message": get_last_message_dict(db, chat.id)
        }
        
        if chat.type == "one_to_one":
            members = db.query(ChatMember).filter(ChatMember.chat_id == chat.id).all()
            chat_dict["members"] = [
                {
                    "id": m.id,
                    "chat_id": m.chat_id,
                    "user_id": m.user_id,
                    "joined_at": m.joined_at,
                    "user": m.user
                } for m in members
            ]
        else:
            # Group chat
            group = db.query(Group).filter(Group.chat_id == chat.id).first()
            if group:
                chat_dict["group_details"] = {
                    "name": group.name,
                    "description": group.description,
                    "group_image": group.group_image,
                    "created_by": group.created_by,
                    "created_at": group.created_at
                }
                group_members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
                # For groups, we populate members mapped as ChatMembers for API schema compatibility
                chat_dict["members"] = [
                    {
                        "id": gm.id,
                        "chat_id": chat.id,
                        "user_id": gm.user_id,
                        "joined_at": gm.joined_at,
                        "user": gm.user,
                        "role": gm.role
                    } for gm in group_members
                ]
        chats_responses.append(chat_dict)
        
    return chats_responses

def get_one_to_one_chat(db: Session, user_a_id: int, user_b_id: int):
    # Find active direct chat between these two users
    member_a_subquery = db.query(ChatMember.chat_id).filter(ChatMember.user_id == user_a_id)
    chat = db.query(Chat).filter(
        and_(
            Chat.type == "one_to_one",
            Chat.id.in_(member_a_subquery)
        )
    ).join(ChatMember).filter(ChatMember.user_id == user_b_id).first()
    return chat

def create_one_to_one_chat(db: Session, user_a_id: int, user_b_id: int):
    if user_a_id == user_b_id:
        raise HTTPException(status_code=400, detail="Cannot start a direct chat with yourself")
        
    # Check if contact exists
    contact = db.query(User).filter(User.id == user_b_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact user not found")
        
    existing_chat = get_one_to_one_chat(db, user_a_id, user_b_id)
    if existing_chat:
        return existing_chat
        
    # Create new chat
    new_chat = Chat(type="one_to_one")
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    # Add members
    member_a = ChatMember(chat_id=new_chat.id, user_id=user_a_id)
    member_b = ChatMember(chat_id=new_chat.id, user_id=user_b_id)
    db.add(member_a)
    db.add(member_b)
    db.commit()
    db.refresh(new_chat)
    return new_chat

def create_group_chat(db: Session, creator_id: int, group_data: GroupCreate):
    # Create the chat wrapper
    new_chat = Chat(type="group")
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    # Create the group details
    new_group = Group(
        chat_id=new_chat.id,
        name=group_data.name,
        description=group_data.description,
        created_by=creator_id
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    # Add creator as admin
    creator_member = GroupMember(
        group_id=new_group.id,
        user_id=creator_id,
        role="admin"
    )
    db.add(creator_member)
    
    # Add other group members
    for u_id in group_data.user_ids:
        if u_id == creator_id:
            continue
        user = db.query(User).filter(User.id == u_id).first()
        if user:
            member = GroupMember(
                group_id=new_group.id,
                user_id=u_id,
                role="member"
            )
            db.add(member)
            
    db.commit()
    db.refresh(new_chat)
    return new_chat

def update_group_details(db: Session, chat_id: int, user_id: int, update_data: GroupUpdate):
    group = db.query(Group).filter(Group.chat_id == chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Check permissions
    member = db.query(GroupMember).filter(
        and_(GroupMember.group_id == group.id, GroupMember.user_id == user_id)
    ).first()
    if not member or member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can modify group details")
        
    if update_data.name is not None:
        group.name = update_data.name
    if update_data.description is not None:
        group.description = update_data.description
    if update_data.group_image is not None:
        group.group_image = update_data.group_image
        
    db.commit()
    db.refresh(group)
    return group

def add_member_to_group(db: Session, chat_id: int, admin_id: int, user_id_to_add: int):
    group = db.query(Group).filter(Group.chat_id == chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Check admin permission
    admin_member = db.query(GroupMember).filter(
        and_(GroupMember.group_id == group.id, GroupMember.user_id == admin_id)
    ).first()
    if not admin_member or admin_member.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add members")
        
    # Check if already a member
    existing = db.query(GroupMember).filter(
        and_(GroupMember.group_id == group.id, GroupMember.user_id == user_id_to_add)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this group")
        
    new_member = GroupMember(
        group_id=group.id,
        user_id=user_id_to_add,
        role="member"
    )
    db.add(new_member)
    db.commit()
    return {"message": "Member added successfully"}

def remove_member_from_group(db: Session, chat_id: int, admin_id: int, user_id_to_remove: int):
    group = db.query(Group).filter(Group.chat_id == chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Check admin permission (unless user is removing themselves)
    if admin_id != user_id_to_remove:
        admin_member = db.query(GroupMember).filter(
            and_(GroupMember.group_id == group.id, GroupMember.user_id == admin_id)
        ).first()
        if not admin_member or admin_member.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can remove members")
            
    # Find member
    member = db.query(GroupMember).filter(
        and_(GroupMember.group_id == group.id, GroupMember.user_id == user_id_to_remove)
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="User is not a member of this group")
        
    db.delete(member)
    db.commit()
    return {"message": "Member removed successfully"}


def delete_chat_for_user(db: Session, chat_id: int, user_id: int):
    """
    For one_to_one chats: fully deletes the entire chat (and all messages via CASCADE).
    For group chats: removes the user from the group (leave group). If no members remain, deletes the chat.
    """
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Verify the user is a member
    if chat.type == "one_to_one":
        member = db.query(ChatMember).filter(
            and_(ChatMember.chat_id == chat_id, ChatMember.user_id == user_id)
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="You are not a member of this chat")
        # Clear reply_to pointers to prevent circular foreign key issues during cascade
        db.query(Message).filter(Message.chat_id == chat_id).update({Message.reply_to: None})
        db.delete(chat)
        db.commit()
    else:
        # Group chat — remove the user from the group
        group = db.query(Group).filter(Group.chat_id == chat_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        gm = db.query(GroupMember).filter(
            and_(GroupMember.group_id == group.id, GroupMember.user_id == user_id)
        ).first()
        if not gm:
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        db.delete(gm)
        db.commit()
        
        # If no group members remain, delete the entire chat
        remaining = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
        if remaining == 0:
            db.query(Message).filter(Message.chat_id == chat_id).update({Message.reply_to: None})
            db.delete(chat)
            db.commit()

    return {"message": "Chat removed successfully"}

