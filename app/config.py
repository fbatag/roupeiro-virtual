import os

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "roupeiro-virtual")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", os.getenv("GEMINI_LOCATION", "global"))
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "roupeiro-virtual-media")

FIREBASE_CONFIG = {
    "apiKey": os.getenv("FIREBASE_API_KEY", "").strip(),
    "authDomain": f"{PROJECT_ID}.firebaseapp.com",
    "projectId": PROJECT_ID,
    "storageBucket": f"{PROJECT_ID}.firebasestorage.app",
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", "526939229036"),
    "appId": "1:526939229036:web:cf8186174e8923ca178149",
    "googleClientId": os.getenv("GOOGLE_CLIENT_ID", "").strip()
}

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
