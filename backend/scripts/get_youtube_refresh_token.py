"""
Run this ONCE locally (not in Docker) to generate a refresh token.

1. Make sure backend/youtube_client_secret.json exists (see README step 2).
2. From the backend/ folder run: python scripts/get_youtube_refresh_token.py
3. A browser window opens — sign in with the Google account that
   manages the EBB YouTube channel and grant access.
4. Copy the printed values into your .env file.
"""

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

flow = InstalledAppFlow.from_client_secrets_file("youtube_client_secret.json", SCOPES)
credentials = flow.run_local_server(port=0)

print("YOUTUBE_CLIENT_ID:", credentials.client_id)
print("YOUTUBE_CLIENT_SECRET:", credentials.client_secret)
print("YOUTUBE_REFRESH_TOKEN:", credentials.refresh_token)