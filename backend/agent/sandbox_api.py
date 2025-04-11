import os
from typing import List, Optional, Union, BinaryIO

from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from utils.logger import logger
from backend.agent.tools.utils.daytona_sandbox import daytona

class FileInfo(BaseModel):
    """Model for file information"""
    name: str
    path: str
    is_dir: bool
    size: int
    mod_time: str
    permissions: Optional[str] = None

class CreateFolderRequest(BaseModel):
    """Request model for creating folders"""
    path: str
    permissions: Optional[str] = None

class FileContentRequest(BaseModel):
    """Request model for file content operations"""
    path: str
    content: str

class SandboxAPI:
    """API wrapper for Daytona file system operations"""
    
    def __init__(self, sandbox_id: str):
        """Initialize the Sandbox API with a sandbox ID
        
        Args:
            sandbox_id: The ID of the Daytona sandbox
        """
        self.sandbox_id = sandbox_id
        try:
            self.sandbox = daytona.get_current_sandbox(sandbox_id)
            logger.info(f"SandboxAPI initialized for sandbox: {sandbox_id}")
        except Exception as e:
            logger.error(f"Error getting sandbox with ID {sandbox_id}: {str(e)}")
            raise e
    
    # CREATE operations
    def create_file(self, path: str, content: Union[str, bytes]) -> bool:
        """Create a new file in the sandbox
        
        Args:
            path: The path where the file should be created
            content: The content to write to the file
            
        Returns:
            bool: True if the file was created successfully
        """
        try:
            if isinstance(content, str):
                content = content.encode('utf-8')
                
            self.sandbox.fs.upload_file(path, content)
            logger.info(f"File created at {path}")
            return True
        except Exception as e:
            logger.error(f"Error creating file at {path}: {str(e)}")
            raise e
    
    # def create_folder(self, path: str, permissions: Optional[str] = None) -> bool:
    #     """Create a new directory in the sandbox
    #     
    #     Args:
    #         path: The path where the directory should be created
    #         permissions: Optional permissions for the directory (e.g., "755")
    #         
    #     Returns:
    #         bool: True if the directory was created successfully
    #     """
    #     try:
    #         if permissions:
    #             self.sandbox.fs.create_folder(path, permissions)
    #         else:
    #             self.sandbox.fs.create_folder(path)
    #         logger.info(f"Folder created at {path}")
    #         return True
    #     except Exception as e:
    #         logger.error(f"Error creating folder at {path}: {str(e)}")
    #         raise e
    
    # READ operations
    def list_files(self, path: str) -> List[FileInfo]:
        """List files and directories at the specified path
        
        Args:
            path: The path to list files from
            
        Returns:
            List[FileInfo]: List of files and directories
        """
        try:
            files = self.sandbox.fs.list_files(path)
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
                
            return result
        except Exception as e:
            logger.error(f"Error listing files at {path}: {str(e)}")
            raise e
    
    def read_file(self, path: str) -> bytes:
        """Read a file from the sandbox
        
        Args:
            path: The path of the file to read
            
        Returns:
            bytes: The content of the file
        """
        try:
            content = self.sandbox.fs.download_file(path)
            return content
        except Exception as e:
            logger.error(f"Error reading file at {path}: {str(e)}")
            raise e
    
    def get_file_info(self, path: str) -> FileInfo:
        """Get information about a file or directory
        
        Args:
            path: The path to get information for
            
        Returns:
            FileInfo: File information
        """
        try:
            file_info = self.sandbox.fs.get_file_info(path)
            return FileInfo(
                name=os.path.basename(path),
                path=path,
                is_dir=file_info.is_dir,
                size=file_info.size,
                mod_time=str(file_info.mod_time),
                permissions=getattr(file_info, 'permissions', None)
            )
        except Exception as e:
            logger.error(f"Error getting file info for {path}: {str(e)}")
            raise e
    
    # # UPDATE operations
    # def update_file(self, path: str, content: Union[str, bytes]) -> bool:
    #     """Update an existing file in the sandbox
    #     
    #     Args:
    #         path: The path of the file to update
    #         content: The new content for the file
    #         
    #     Returns:
    #         bool: True if the file was updated successfully
    #     """
    #     # For simplicity, we use the same method as create_file, as upload_file will overwrite
    #     return self.create_file(path, content)
    
    # def set_file_permissions(self, path: str, permissions: str) -> bool:
    #     """Set permissions for a file or directory
    #     
    #     Args:
    #         path: The path of the file or directory
    #         permissions: The permissions to set (e.g., "644", "755")
    #         
    #     Returns:
    #         bool: True if permissions were set successfully
    #     """
    #     try:
    #         self.sandbox.fs.set_file_permissions(path, permissions)
    #         logger.info(f"Permissions set to {permissions} for {path}")
    #         return True
    #     except Exception as e:
    #         logger.error(f"Error setting permissions for {path}: {str(e)}")
    #         raise e
    
    # # DELETE operations
    # def delete_file(self, path: str) -> bool:
    #     """Delete a file from the sandbox
    #     
    #     Args:
    #         path: The path of the file to delete
    #         
    #     Returns:
    #         bool: True if the file was deleted successfully
    #     """
    #     try:
    #         self.sandbox.fs.delete_file(path)
    #         logger.info(f"File deleted at {path}")
    #         return True
    #     except Exception as e:
    #         logger.error(f"Error deleting file at {path}: {str(e)}")
    #         raise e
    
    # # SEARCH operations
    # def find_files(self, path: str, pattern: str) -> List[dict]:
    #     """Search for text in files
    #     
    #     Args:
    #         path: The path to search in
    #         pattern: The text pattern to search for
    #         
    #     Returns:
    #         List[dict]: List of matches with file, line, and content
    #     """
    #     try:
    #         results = self.sandbox.fs.find_files(path=path, pattern=pattern)
    #         return [
    #             {"file": match.file, "line": match.line, "content": match.content}
    #             for match in results
    #         ]
    #     except Exception as e:
    #         logger.error(f"Error searching for pattern {pattern} in {path}: {str(e)}")
    #         raise e
    
    # def replace_in_files(self, files: List[str], pattern: str, new_value: str) -> bool:
    #     """Replace text in files
    #     
    #     Args:
    #         files: List of file paths to perform replacement in
    #         pattern: The text pattern to replace
    #         new_value: The replacement text
    #         
    #     Returns:
    #         bool: True if replacement was successful
    #     """
    #     try:
    #         self.sandbox.fs.replace_in_files(files, pattern, new_value)
    #         logger.info(f"Replaced '{pattern}' with '{new_value}' in {len(files)} files")
    #         return True
    #     except Exception as e:
    #         logger.error(f"Error replacing '{pattern}' with '{new_value}': {str(e)}")
    #         raise e

# Create a router for the Sandbox API instead of a standalone FastAPI app
router = APIRouter(tags=["sandbox"])

# Store sandbox instances
sandboxes = {}

@router.post("/sandboxes/{sandbox_id}/connect")
async def connect_sandbox(sandbox_id: str):
    """Connect to a sandbox and initialize the API"""
    try:
        sandboxes[sandbox_id] = SandboxAPI(sandbox_id)
        return {"status": "connected", "sandbox_id": sandbox_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# CREATE endpoints
@router.post("/sandboxes/{sandbox_id}/files")
async def create_file_endpoint(sandbox_id: str, file_request: FileContentRequest):
    """Create a file in the sandbox"""
    if sandbox_id not in sandboxes:
        raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
    try:
        result = sandboxes[sandbox_id].create_file(file_request.path, file_request.content)
        return {"status": "success", "created": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# READ endpoints
@router.get("/sandboxes/{sandbox_id}/files")
async def list_files_endpoint(sandbox_id: str, path: str):
    """List files and directories at the specified path"""
    if sandbox_id not in sandboxes:
        raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
    try:
        files = sandboxes[sandbox_id].list_files(path)
        return {"files": [file.dict() for file in files]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sandboxes/{sandbox_id}/files/content")
async def read_file_endpoint(sandbox_id: str, path: str):
    """Read a file from the sandbox"""
    if sandbox_id not in sandboxes:
        raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
    try:
        content = sandboxes[sandbox_id].read_file(path)
        return FileResponse(
            path=path,
            filename=os.path.basename(path),
            media_type="application/octet-stream",
            content=content
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sandboxes/{sandbox_id}/files/info")
async def get_file_info_endpoint(sandbox_id: str, path: str):
    """Get information about a file or directory"""
    if sandbox_id not in sandboxes:
        raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
    try:
        file_info = sandboxes[sandbox_id].get_file_info(path)
        return file_info.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# # UPDATE endpoints
# @router.put("/sandboxes/{sandbox_id}/files")
# async def update_file_endpoint(sandbox_id: str, file_request: FileContentRequest):
#     """Update a file in the sandbox"""
#     if sandbox_id not in sandboxes:
#         raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
#     try:
#         result = sandboxes[sandbox_id].update_file(file_request.path, file_request.content)
#         return {"status": "success", "updated": result}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.put("/sandboxes/{sandbox_id}/files/permissions")
# async def set_permissions_endpoint(sandbox_id: str, path: str, permissions: str):
#     """Set permissions for a file or directory"""
#     if sandbox_id not in sandboxes:
#         raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
#     try:
#         result = sandboxes[sandbox_id].set_file_permissions(path, permissions)
#         return {"status": "success", "updated": result}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# # DELETE endpoints
# @router.delete("/sandboxes/{sandbox_id}/files")
# async def delete_file_endpoint(sandbox_id: str, path: str):
    """Delete a file from the sandbox"""
    if sandbox_id not in sandboxes:
        raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
    try:
        result = sandboxes[sandbox_id].delete_file(path)
        return {"status": "success", "deleted": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# @router.post("/sandboxes/{sandbox_id}/folders")
# async def create_folder_endpoint(sandbox_id: str, folder_request: CreateFolderRequest):
#     """Create a folder in the sandbox"""
#     if sandbox_id not in sandboxes:
#         raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
#     try:
#         result = sandboxes[sandbox_id].create_folder(
#             folder_request.path, 
#             folder_request.permissions
#         )
#         return {"status": "success", "created": result}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# # SEARCH endpoints
# @router.get("/sandboxes/{sandbox_id}/search")
# async def search_files_endpoint(sandbox_id: str, path: str, pattern: str):
#     """Search for text in files"""
#     if sandbox_id not in sandboxes:
#         raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
#     try:
#         results = sandboxes[sandbox_id].find_files(path, pattern)
#         return {"matches": results}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/sandboxes/{sandbox_id}/replace")
# async def replace_in_files_endpoint(
#     sandbox_id: str, 
#     files: List[str], 
#     pattern: str, 
#     new_value: str
# ):
#     """Replace text in files"""
#     if sandbox_id not in sandboxes:
#         raise HTTPException(status_code=404, detail=f"Sandbox {sandbox_id} not connected")
    
#     try:
#         result = sandboxes[sandbox_id].replace_in_files(files, pattern, new_value)
#         return {"status": "success", "replaced": result}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
