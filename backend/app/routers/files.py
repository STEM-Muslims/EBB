from app.core.config import S3_BUCKET_NAME, s3_client
from app.dependencies import require_admin
from fastapi import APIRouter, Depends, File, UploadFile

router = APIRouter()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), _: str = Depends(require_admin)):
    s3_client.upload_fileobj(
        file.file,
        S3_BUCKET_NAME,
        file.filename,
    )

    return {
        "success": True,
        "filename": file.filename,
    }
