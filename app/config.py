import os

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "roupeiro-virtual")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", os.getenv("GEMINI_LOCATION", "global"))
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "roupeiro-virtual-media")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()


def get_firebase_config() -> dict:
    """Returns Firebase client config from Cloud Run environment variables."""
    api_key = os.getenv("FIREBASE_API_KEY", "").strip()
    client_id = os.getenv("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID).strip()
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
