import os
import tempfile

from app.core.config import S3_BUCKET_NAME, s3_client
from app.core.youtube import upload_video
from app.dependencies import require_admin
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/youtube", tags=["youtube"])


class YouTubeUploadRequest(BaseModel):
    s3_key: str
    title: str
    description: str = ""
    privacy_status: str = "unlisted"


@router.post("/upload")
def youtube_upload(payload: YouTubeUploadRequest, _: str = Depends(require_admin)):
    suffix = os.path.splitext(payload.s3_key)[1]

    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        s3_client.download_fileobj(S3_BUCKET_NAME, payload.s3_key, tmp)
        tmp.flush()

        result = upload_video(
            file_path=tmp.name,
            title=payload.title,
            description=payload.description,
            privacy_status=payload.privacy_status,
        )

    video_id = result["id"]
    return {
        "success": True,
        "youtube_video_id": video_id,
        "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
    }