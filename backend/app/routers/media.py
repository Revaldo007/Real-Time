from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.core.config import settings
import os
import uuid
import shutil

router = APIRouter(prefix="/media", tags=["media"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename to avoid collision
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    # Determine basic media type
    content_type = file.content_type or ""
    media_type = "document"
    if content_type.startswith("image/"):
        media_type = "image"
    elif content_type.startswith("video/"):
        media_type = "video"
    elif content_type.startswith("audio/"):
        media_type = "voice"
        
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Return path accessible via static files mount
    relative_url = f"/uploads/{unique_filename}"
    
    return {
        "file_url": relative_url,
        "file_name": file.filename,
        "file_type": media_type,
        "file_size": file_size
    }
