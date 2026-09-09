import logging
from datetime import datetime
import httpx

logger = logging.getLogger(__name__)

GOOGLE_PHOTOS_API_BASE = "https://photoslibrary.googleapis.com/v1"

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

async def download_photo_bytes(base_url: str) -> bytes:
    """
    Downloads high-resolution photo from Google Photos baseUrl.
    """
    # Use =w2048-h2048 or =d to get high-res photo bytes
    download_url = f"{base_url}=w2048-h2048"
    async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
        response = await client.get(download_url)
        if response.status_code != 200:
            # Fallback to direct download URL
            response = await client.get(f"{base_url}=d")
            if response.status_code != 200:
                raise RuntimeError(f"Failed to download image from Google Photos: HTTP {response.status_code}")
        return response.content
