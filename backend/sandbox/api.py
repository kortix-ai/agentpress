import os
from typing import List, Optional, Union, BinaryIO

from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

from utils.logger import logger
from sandbox.sandbox import get_or_start_sandbox

# TODO: ADD AUTHORIZATION TO ONLY HAVE ACCESS TO SANDBOXES OF PROJECTS U HAVE ACCESS TO

class FileInfo(BaseModel):
    """Model for file information"""
    name: str
    path: str
    is_dir: bool
    size: int
    mod_time: str
    permissions: Optional[str] = None

class FileContentRequest(BaseModel):
    """Request model for file content operations"""
    path: str
    content: str

# Create a router for the Sandbox API
router = APIRouter(tags=["sandbox"])

@router.post("/sandboxes/{sandbox_id}/files")
async def create_file(sandbox_id: str, file_request: FileContentRequest):
    """Create a file in the sandbox"""
    try:
        # Get or start sandbox instance using the async function
        sandbox = await get_or_start_sandbox(sandbox_id)
        
        # Prepare content
        content = file_request.content
        if isinstance(content, str):
            content = content.encode('utf-8')
        
        # Create file
        sandbox.fs.upload_file(file_request.path, content)
        logger.info(f"File created at {file_request.path} in sandbox {sandbox_id}")
        
        return {"status": "success", "created": True}
    except Exception as e:
        logger.error(f"Error creating file in sandbox {sandbox_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sandboxes/{sandbox_id}/files")
async def list_files(sandbox_id: str, path: str):
    """List files and directories at the specified path"""
    try:
        # Get or start sandbox instance using the async function
        sandbox = await get_or_start_sandbox(sandbox_id)
        
        # List files
        files = sandbox.fs.list_files(path)
        result = []
        
        for file in files:
            # Convert file information to our model
            file_info = FileInfo(
                name=file.name,
                path=os.path.join(path, file.name),
                is_dir=file.is_dir,
                size=file.size,
                mod_time=str(file.mod_time),
                permissions=getattr(file, 'permissions', None)
            )
            result.append(file_info)
        
        return {"files": [file.dict() for file in result]}
    except Exception as e:
        logger.error(f"Error listing files in sandbox {sandbox_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sandboxes/{sandbox_id}/files/content")
async def read_file(sandbox_id: str, path: str):
    """Read a file from the sandbox"""
    try:
        # Get or start sandbox instance using the async function
        sandbox = await get_or_start_sandbox(sandbox_id)
        
        # Read file
        content = sandbox.fs.download_file(path)
        
        # Instead of using FileResponse with content parameter (which doesn't exist),
        # return a Response object with the content directly
        filename = os.path.basename(path)
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error reading file in sandbox {sandbox_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
