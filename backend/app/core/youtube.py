import os

import google.oauth2.credentials
import googleapiclient.discovery
import googleapiclient.http

_TOKEN_URI = "https://oauth2.googleapis.com/token"
# Full "youtube" scope covers both uploading AND updating videos (e.g. changing
# privacy). The narrower "youtube.upload" scope cannot update an existing video,
# so the refresh token must be regenerated after widening this.
_SCOPES = ["https://www.googleapis.com/auth/youtube"]


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"YouTube upload is not configured: missing environment variable {name}"
        )
    return value


def get_youtube_client():
    credentials = google.oauth2.credentials.Credentials(
        token=None,
        refresh_token=_require_env("YOUTUBE_REFRESH_TOKEN"),
        token_uri=_TOKEN_URI,
        client_id=_require_env("YOUTUBE_CLIENT_ID"),
        client_secret=_require_env("YOUTUBE_CLIENT_SECRET"),
        scopes=_SCOPES,
    )
    return googleapiclient.discovery.build("youtube", "v3", credentials=credentials)


def upload_video(
    file_path: str,
    title: str,
    description: str = "",
    privacy_status: str = "unlisted",
    tags: list[str] | None = None,
) -> dict:
    youtube = get_youtube_client()

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags or [],
        },
        "status": {
            "privacyStatus": privacy_status,
        },
    }

    media = googleapiclient.http.MediaFileUpload(
        file_path, chunksize=-1, resumable=True, mimetype="video/*"
    )
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        _, response = request.next_chunk()

    return response


def set_video_privacy(video_id: str, privacy_status: str = "unlisted") -> dict:
    """Update the privacy status of an existing YouTube video (e.g. to take it
    down by unlisting it). Requires the full "youtube" scope, not "youtube.upload".
    """
    youtube = get_youtube_client()

    return (
        youtube.videos()
        .update(
            part="status",
            body={
                "id": video_id,
                "status": {"privacyStatus": privacy_status},
            },
        )
        .execute()
    )