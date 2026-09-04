from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
import json
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.chat import ChatMember
from app.models.group import Group, GroupMember
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket, db: Session):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Update user status to online
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_online = True
            db.commit()
            
        # Broadcast user online status
        await self.broadcast({
            "type": "user_online",
            "user_id": user_id
        })

    async def disconnect(self, user_id: int, websocket: WebSocket, db: Session):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
                # Update user status to offline
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.is_online = False
                    user.last_seen = datetime.utcnow()
                    db.commit()
                    
                    # Broadcast user offline status
                    await self.broadcast({
                        "type": "user_offline",
                        "user_id": user_id,
                        "last_seen": user.last_seen.isoformat()
                    })

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def send_to_user(self, user_id: int, payload: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    pass  # connection might have dropped

    async def broadcast(self, payload: dict):
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(payload)
                except Exception:
                    pass

    async def broadcast_to_chat(self, chat_id: int, payload: dict, db: Session, exclude_user_id: Optional[int] = None):
        # Fetch all member user IDs for this chat
        from app.models.chat import Chat
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            return
            
        member_ids = []
        if chat.type == "one_to_one":
            members = db.query(ChatMember).filter(ChatMember.chat_id == chat_id).all()
            member_ids = [m.user_id for m in members]
        else:
            group = db.query(Group).filter(Group.chat_id == chat_id).first()
            if group:
                members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
                member_ids = [m.user_id for m in members]
                
        for u_id in member_ids:
            if exclude_user_id and u_id == exclude_user_id:
                continue
            await self.send_to_user(u_id, payload)

manager = ConnectionManager()
