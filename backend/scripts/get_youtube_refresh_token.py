"""
Run this ONCE locally (not in Docker) to generate a YouTube refresh token.

Prerequisites:
  - In Google Cloud Console (same project as the app): enable "YouTube Data API v3",
    and have an OAuth client (Desktop, or Web with a localhost redirect URI added).
  - Export the client credentials into your environment, e.g. add to backend/.env:
        YOUTUBE_CLIENT_ID=...
        YOUTUBE_CLIENT_SECRET=...

Usage (from the backend/ folder):
    # Desktop OAuth client (random loopback port is fine):
    python scripts/get_youtube_refresh_token.py

    # Web OAuth client: pin the port to a registered redirect URI, e.g.
    # add http://localhost:8080/ under "Authorized redirect URIs" first, then:
    python scripts/get_youtube_refresh_token.py 8080

A browser window opens — sign in with the Google account that manages the EBB
YouTube channel and grant access. The refresh token is then printed; copy it
into your .env as YOUTUBE_REFRESH_TOKEN.
"""

import os
import sys

from dotenv import load_dotenv
from google_auth_oauthlib.flow import InstalledAppFlow

# Full "youtube" scope so the token can both upload videos AND update them
# (e.g. unlist a video when it's removed). "youtube.upload" alone cannot update.
SCOPES = ["https://www.googleapis.com/auth/youtube"]


def main() -> None:
    load_dotenv()

    client_id = os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET")
    if not client_id or not client_secret:
        sys.exit(
            "Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in your environment "
            "(or backend/.env) before running this script."
        )

    # 0 => random loopback port (Desktop clients). Pass a port arg for Web clients
    # whose "Authorized redirect URIs" must list http://localhost:<port>/.
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 0

    flow = InstalledAppFlow.from_client_config(
        {
            "installed": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost"],
            }
        },
        scopes=SCOPES,
    )

    # access_type=offline + prompt=consent are required to get a refresh token.
    credentials = flow.run_local_server(
        port=port, access_type="offline", prompt="consent"
    )

    if not credentials.refresh_token:
        sys.exit(
            "No refresh token returned. Revoke prior access at "
            "https://myaccount.google.com/permissions and rerun."
        )

    print("\nAdd this to your .env:\n")
    print(f"YOUTUBE_REFRESH_TOKEN={credentials.refresh_token}")


if __name__ == "__main__":
    main()
