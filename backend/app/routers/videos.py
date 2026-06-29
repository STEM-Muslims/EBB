import os
import tempfile
import uuid

from app.core.config import AWS_REGION, S3_BUCKET_NAME, s3_client
from app.core.youtube import set_video_privacy, upload_video
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.video import Video, VideoStatus
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, col, select

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
    user: User = Depends(get_current_user),
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
            uploaded_by=user.email,
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


@router.get("")
def list_videos(
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """All uploaded videos, newest first. The frontend filters to the rows whose
    `uploaded_by` matches the current user to decide what they can manage.

    The S3 location (`s3_key`/`s3_url`) is admin-only — it's stripped for
    non-admin users so the raw storage link is never exposed to them, even if
    this endpoint is later opened to non-admin roles."""
    videos = session.exec(select(Video).order_by(col(Video.created_at).desc())).all()

    result = []
    for video in videos:
        data = video.model_dump()
        if not user.is_admin:
            data["s3_key"] = None
            data["s3_url"] = None
        result.append(data)
    return result


@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    session: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Take a video back down: delete it from S3, make it private on YouTube, and
    remove the database row. The uploader may remove their own video; admins may
    remove any. Returns a per-step breakdown so partial failures (e.g. the object
    already gone from S3) are visible rather than silently swallowed."""
    video = session.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if not user.is_admin and video.uploaded_by != user.email:
        raise HTTPException(
            status_code=403, detail="You can only remove videos you uploaded"
        )

    steps = {
        "s3": _step(False, "not attempted"),
        "youtube": _step(False, "not attempted"),
        "database": _step(False, "not attempted"),
    }

    # --- S3 ---
    if video.s3_key:
        try:
            s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=video.s3_key)
            steps["s3"] = _step(True)
        except Exception as exc:  # noqa: BLE001
            steps["s3"] = _step(False, str(exc))
    else:
        steps["s3"] = _step(True, None)  # nothing in S3 to remove

    # --- YouTube (make private, not delete) ---
    if video.youtube_video_id:
        try:
            set_video_privacy(video.youtube_video_id, "private")
            steps["youtube"] = _step(True)
        except Exception as exc:  # noqa: BLE001
            steps["youtube"] = _step(False, str(exc))
    else:
        steps["youtube"] = _step(True, None)  # never made it to YouTube

    # --- Database ---
    try:
        session.delete(video)
        session.commit()
        steps["database"] = _step(True)
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        steps["database"] = _step(False, str(exc))

    success = all(step["success"] for step in steps.values())
    failed_steps = [name for name, step in steps.items() if not step["success"]]

    return {
        "success": success,
        "message": (
            "Video removed from S3 and the database, and made private on YouTube."
            if success
            else f"Removal incomplete — failed: {', '.join(failed_steps)}."
        ),
        "steps": steps,
    }
