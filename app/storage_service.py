import io
import logging
from google.cloud import storage
from app.config import PROJECT_ID, BUCKET_NAME

logger = logging.getLogger(__name__)

_storage_client = None

def get_storage_client():
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client(project=PROJECT_ID)
    return _storage_client

def upload_bytes(data: bytes, path: str, content_type: str = "image/png") -> str:
    client = get_storage_client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(path)
    blob.upload_from_string(data, content_type=content_type)
    logger.info(f"Uploaded {len(data)} bytes to gs://{BUCKET_NAME}/{path}")
    return path

def get_blob_bytes(path: str) -> tuple[bytes, str]:
    client = get_storage_client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(path)
    if not blob.exists():
        raise FileNotFoundError(f"Blob not found: {path}")
    content = blob.download_as_bytes()
    content_type = blob.content_type or "image/png"
    return content, content_type

def delete_blob(path: str):
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(path)
        if blob.exists():
            blob.delete()
            logger.info(f"Deleted gs://{BUCKET_NAME}/{path}")
    except Exception as e:
        logger.warning(f"Failed to delete blob {path}: {e}")


def copy_blob(source_path: str, dest_path: str) -> bool:
    """Copies a blob within the GCS bucket to a new destination path."""
    if not source_path or not dest_path:
        return False
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        source_blob = bucket.blob(source_path)
        if not source_blob.exists():
            logger.warning(f"Source blob does not exist for copy: {source_path}")
            return False
        bucket.copy_blob(source_blob, bucket, dest_path)
        logger.info(f"Copied gs://{BUCKET_NAME}/{source_path} -> gs://{BUCKET_NAME}/{dest_path}")
        return True
    except Exception as e:
        logger.warning(f"Failed to copy blob {source_path} -> {dest_path}: {e}")
        return False

