import os
import logging

logger = logging.getLogger(__name__)

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "roupeiro-virtual")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", os.getenv("GEMINI_LOCATION", "global"))
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "roupeiro-virtual-media")


def get_secret(secret_name: str, default: str = "") -> str:
    """
    Fetches a secret value from:
    1. Cloud Run mounted environment variable (os.getenv), stripped of whitespace/newlines.
    2. Google Cloud Secret Manager API directly (projects/<PROJECT_ID>/secrets/<secret_name>/versions/latest)
       if the environment variable is empty or blank.
    """
    env_val = os.getenv(secret_name, "").strip()
    if env_val:
        return env_val

    try:
        from google.cloud import secretmanager
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{PROJECT_ID}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        payload = response.payload.data.decode("UTF-8").strip()
        if payload:
            return payload
    except Exception as e:
        logger.warning(f"Could not access secret '{secret_name}' from Secret Manager: {e}")

    return default


GOOGLE_CLIENT_ID = get_secret("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = get_secret("GOOGLE_CLIENT_SECRET", "")


def get_firebase_config() -> dict:
    """Returns fresh Firebase client config, dynamically resolving secrets."""
    api_key = get_secret("FIREBASE_API_KEY", "")
    client_id = get_secret("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID)
    return {
        "apiKey": api_key,
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", PROJECT_ID + ".firebaseapp.com"),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", PROJECT_ID),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", PROJECT_ID + ".firebasestorage.app"),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", "526939229036"),
        "appId": os.getenv("FIREBASE_APP_ID", "1:526939229036:web:cf8186174e8923ca178149"),
        "googleClientId": client_id
    }


FIREBASE_CONFIG = get_firebase_config()

VALID_CATEGORIES = [
    "Camisas",
    "Camisetas",
    "Calças",
    "Casacos & Jaquetas",
    "Bermudas & Shorts",
    "Vestidos & Saias",
    "Calçados",
    "Acessórios",
    "Moda Íntima",
    "Moda Praia",
    "Outros"
]
