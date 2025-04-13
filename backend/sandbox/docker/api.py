from fastapi import FastAPI
from automation_service import automation_service

# Create API app
api_app = FastAPI()

@api_app.get("/api")
async def health_check():
    return {"status": "ok", "message": "API server is running"}

# Include automation service router with /api prefix
api_app.include_router(automation_service.router, prefix="/api")

# This is needed for the import string approach with uvicorn
if __name__ == '__main__':
    import uvicorn
    print("Starting API server")
    uvicorn.run("api:api_app", host="0.0.0.0", port=8000) 