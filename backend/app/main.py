from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
import json

from app.core.config import settings
from app.database.connection import get_db
from app.core.security import decode_access_token
from app.routers import auth, users, chats, groups, messages, media
from app.websocket.chat_socket import manager

app = FastAPI(title="Rivo Chat API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development. Can be restricted to ["http://localhost:5173"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chats.router)
app.include_router(groups.router)
app.include_router(messages.router)
app.include_router(media.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Rivo Chat API"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # Authenticate connection via token query param
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)  # Unauthorized
        return
        
    user_id_str = payload.get("sub")
    if not user_id_str:
        await websocket.close(code=4001)
        return
        
    user_id = int(user_id_str)
    db = next(get_db())
    
    # Register connection
    await manager.connect(user_id, websocket, db)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            try:
                event = json.loads(data)
                event_type = event.get("type")
                chat_id = event.get("chat_id")
                
                if not event_type or not chat_id:
                    continue
                    
                # Format payload with sender details
                event["sender_id"] = user_id
                
                # Handle typing events
                if event_type in ["typing_start", "typing_stop"]:
                    await manager.broadcast_to_chat(
                        chat_id=chat_id,
                        payload={
                            "type": event_type,
                            "chat_id": chat_id,
                            "user_id": user_id
                        },
                        db=db,
                        exclude_user_id=user_id
                    )
                # Handle WebRTC call signals
                elif event_type in ["call_offer", "call_answer", "ice_candidate", "call_hangup"]:
                    await manager.broadcast_to_chat(
                        chat_id=chat_id,
                        payload=event,
                        db=db,
                        exclude_user_id=user_id
                    )
            except Exception as e:
                # Handle JSON parse errors or broadcast errors silently
                print(f"Error handling WebSocket message: {e}")
                
    except WebSocketDisconnect:
        await manager.disconnect(user_id, websocket, db)
