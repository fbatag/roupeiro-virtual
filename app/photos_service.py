import logging
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)

GOOGLE_PHOTOS_API_BASE = "https://photoslibrary.googleapis.com/v1"
GOOGLE_PHOTOS_PICKER_BASE = "https://photospicker.googleapis.com/v1"


async def create_picker_session(access_token: str) -> dict:
    """
    Creates a new Google Photos Picker session (v1/sessions).
    Returns { id, pickerUri, pollingConfig, mediaItemsSet }.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{GOOGLE_PHOTOS_PICKER_BASE}/sessions", headers=headers, json={})
        if response.status_code != 200:
            logger.error(f"Google Photos Picker create session error ({response.status_code}): {response.text}")
            raise RuntimeError(f"Google Photos Picker API error ({response.status_code}): {response.text}")
        return response.json()


async def get_picker_session(access_token: str, session_id: str) -> dict:
    """
    Checks status of a Google Photos Picker session (v1/sessions/{sessionId}).
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{GOOGLE_PHOTOS_PICKER_BASE}/sessions/{session_id}", headers=headers)
        if response.status_code != 200:
            logger.error(f"Google Photos Picker get session error ({response.status_code}): {response.text}")
            raise RuntimeError(f"Google Photos Picker API error ({response.status_code}): {response.text}")
        return response.json()


async def list_picker_media_items(access_token: str, session_id: str) -> dict:
    """
    Lists media items selected by the user in a completed Google Photos Picker session.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    params = {"sessionId": session_id, "pageSize": 100}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{GOOGLE_PHOTOS_PICKER_BASE}/mediaItems", headers=headers, params=params)
        if response.status_code != 200:
            logger.error(f"Google Photos Picker mediaItems error ({response.status_code}): {response.text}")
            raise RuntimeError(f"Google Photos Picker API error ({response.status_code}): {response.text}")

        data = response.json()
        raw_items = data.get("mediaItems", [])
        photos = []

        for item in raw_items:
            media_file = item.get("mediaFile", {})
            mime = media_file.get("mimeType") or item.get("mimeType", "")
            base_url = media_file.get("baseUrl") or item.get("baseUrl", "")
            filename = media_file.get("filename") or item.get("filename", "google_photo.jpg")
            creation_time = item.get("createTime") or item.get("mediaMetadata", {}).get("creationTime", "")

            if not base_url:
                continue

            formatted_date = ""
            if creation_time:
                try:
                    dt = datetime.fromisoformat(creation_time.replace("Z", "+00:00"))
                    formatted_date = dt.strftime("%Y-%m-%d")
                except Exception:
                    formatted_date = creation_time[:10]

            from urllib.parse import quote
            proxy_thumb = f"/api/google-photos/proxy-image?url={quote(base_url + '=w400-h400-c', safe='')}&token={quote(access_token, safe='')}"

            photos.append({
                "id": item.get("id"),
                "filename": filename,
                "mimeType": mime,
                "baseUrl": base_url,
                "thumbnailUrl": proxy_thumb,
                "previewUrl": f"{base_url}=w1024-h1024",
                "downloadUrl": f"{base_url}=d",
                "creationTime": creation_time,
                "acquisitionDateSuggestion": formatted_date,
                "description": item.get("description", "")
            })

        return {
            "photos": photos,
            "nextPageToken": data.get("nextPageToken")
        }


async def list_google_photos(access_token: str, page_size: int = 50, page_token: str = None) -> dict:
    """
    Lists media items from the logged-in user's Google Photos library.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    params = {"pageSize": min(page_size, 100)}
    if page_token:
        params["pageToken"] = page_token

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{GOOGLE_PHOTOS_API_BASE}/mediaItems", headers=headers, params=params)
        
        if response.status_code != 200:
            logger.error(f"Google Photos API error ({response.status_code}): {response.text}")
            raise RuntimeError(f"Google Photos API error: {response.text}")
            
        data = response.json()
        raw_items = data.get("mediaItems", [])
        
        # Filter for photos/images only and format response
        photos = []
        for item in raw_items:
            mime = item.get("mimeType", "")
            if mime.startswith("image/"):
                base_url = item.get("baseUrl")
                meta = item.get("mediaMetadata", {})
                creation_time = meta.get("creationTime", "")
                
                # Format date string YYYY-MM-DD
                formatted_date = ""
                if creation_time:
                    try:
                        dt = datetime.fromisoformat(creation_time.replace("Z", "+00:00"))
                        formatted_date = dt.strftime("%Y-%m-%d")
                    except Exception:
                        formatted_date = creation_time[:10]
                        
                photos.append({
                    "id": item.get("id"),
                    "filename": item.get("filename", "google_photo.jpg"),
                    "mimeType": mime,
                    "baseUrl": base_url,
                    "thumbnailUrl": f"{base_url}=w400-h400-c",
                    "previewUrl": f"{base_url}=w1024-h1024",
                    "downloadUrl": f"{base_url}=d",
                    "creationTime": creation_time,
                    "acquisitionDateSuggestion": formatted_date,
                    "description": item.get("description", "")
                })
                
        return {
            "photos": photos,
            "nextPageToken": data.get("nextPageToken")
        }

async def download_photo_bytes(base_url: str, access_token: str = None) -> bytes:
    """
    Downloads high-resolution photo from Google Photos baseUrl.
    Supports authenticated requests required by Google Photos Picker API.
    """
    headers = {}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    download_url = f"{base_url}=w2048-h2048"
    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        response = await client.get(download_url, headers=headers)
        if response.status_code != 200:
            # Fallback to direct download URL
            response = await client.get(f"{base_url}=d", headers=headers)
            if response.status_code != 200:
                raise RuntimeError(f"Failed to download image from Google Photos: HTTP {response.status_code}")
        return response.content

