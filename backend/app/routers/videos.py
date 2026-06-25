import os
import tempfile
import uuid

from app.core.config import AWS_REGION, S3_BUCKET_NAME, s3_client
from app.core.youtube import upload_video
from app.dependencies import get_db, require_admin
from app.models.video import Video, VideoStatus
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlmodel import Session

router = APIRouter(prefix="/videos", tags=["videos"])


def _s3_url(key: str) -> str:
    return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"


def _step(success: bool, error: str | None = None) -> dict:
    return {"success": success, "error": error}


@router.post("/upload")
async def upload_video_pipeline(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    privacy_status: str = Form("unlisted"),
    session: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Upload a single video file and publish it to S3 + YouTube, recording the
    result in the database. Always returns 200 with a per-step breakdown so the
    caller can see exactly which destination (s3 / youtube / database) failed."""

    steps = {
        "s3": _step(False, "not attempted"),
        "youtube": _step(False, "not attempted"),
        "database": _step(False, "not attempted"),
    }

    filename = file.filename or "video.mp4"
    s3_key = f"videos/{uuid.uuid4().hex}/{filename}"

    # Stream the upload to a temp file once; both S3 and YouTube read from it so a
    # failure in one destination doesn't block the other.
    suffix = os.path.splitext(filename)[1]
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            while chunk := await file.read(1024 * 1024):
                tmp.write(chunk)

        # --- Step 1: S3 ---
        s3_url: str | None = None
        try:
            s3_client.upload_file(tmp_path, S3_BUCKET_NAME, s3_key)
            s3_url = _s3_url(s3_key)
            steps["s3"] = _step(True)
        except Exception as exc:  # noqa: BLE001 - surface the reason to the client
            steps["s3"] = _step(False, str(exc))

        # --- Step 2: YouTube ---
        youtube_video_id: str | None = None
        youtube_url: str | None = None
        try:
            result = upload_video(
                file_path=tmp_path,
                title=title,
                description=description,
                privacy_status=privacy_status,
            )
            youtube_video_id = result["id"]
            youtube_url = f"https://www.youtube.com/watch?v={youtube_video_id}"
            steps["youtube"] = _step(True)
        except Exception as exc:  # noqa: BLE001
            steps["youtube"] = _step(False, str(exc))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    # --- Step 3: Database ---
    if steps["s3"]["success"] and steps["youtube"]["success"]:
        status = VideoStatus.COMPLETED
    elif steps["s3"]["success"]:
        status = VideoStatus.S3_UPLOADED
    else:
        status = VideoStatus.FAILED

    failed = [name for name in ("s3", "youtube") if not steps[name]["success"]]
    error_summary = (
        None if not failed else "; ".join(f"{n}: {steps[n]['error']}" for n in failed)
    )

    video: Video | None = None
    try:
        video = Video(
            title=title,
            description=description,
            privacy_status=privacy_status,
            s3_key=s3_key if steps["s3"]["success"] else None,
            s3_url=s3_url if steps["s3"]["success"] else None,
            youtube_video_id=youtube_video_id,
            youtube_url=youtube_url,
            status=status,
            error=error_summary,
        )
        session.add(video)
        session.commit()
        session.refresh(video)
        steps["database"] = _step(True)
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        steps["database"] = _step(False, str(exc))

    success = all(step["success"] for step in steps.values())
    failed_steps = [name for name, step in steps.items() if not step["success"]]

    return {
        "success": success,
        "message": (
            "Video uploaded to S3, YouTube and recorded in the database."
            if success
            else f"Upload incomplete — failed: {', '.join(failed_steps)}."
        ),
        "steps": steps,
        "video": video,
    }
