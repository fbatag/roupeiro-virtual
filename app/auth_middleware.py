import logging
from fastapi import HTTPException, Header
import httpx
from google.auth.transport import requests as auth_requests
from google.oauth2 import id_token
from app.config import PROJECT_ID, GOOGLE_CLIENT_ID

logger = logging.getLogger(__name__)
_request_adapter = auth_requests.Request()

async def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Validates Firebase ID token or Google OAuth ID token from the Authorization header.
    Strictly requires a valid, authenticated user. No guest or unauthenticated access permitted.
    Returns user dict with uid, email, name, and picture.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Autenticação obrigatória. Por favor, entre com sua Conta Google via Firebase."
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Formato do cabeçalho Authorization inválido. Esperado 'Bearer <token>'."
        )

    token = parts[1]
    if not token or len(token) < 20:
        raise HTTPException(
            status_code=401,
            detail="Token de autenticação ausente ou inválido."
        )

    # 1. Cryptographically verify Firebase ID Token
    try:
        claims = id_token.verify_firebase_token(token, _request_adapter, audience=PROJECT_ID)
        uid = claims.get("user_id") or claims.get("sub")
        if uid:
            email = claims.get("email", "")
            name = claims.get("name") or (email.split("@")[0] if email else "Usuário Google")
            return {
                "uid": uid,
                "email": email,
                "name": name,
                "picture": claims.get("picture", "")
            }
    except Exception as e:
        logger.debug(f"Firebase token verification failed: {e}")

    # 2. Cryptographically verify Google OAuth2 ID Token
    for aud in [GOOGLE_CLIENT_ID, None]:
        try:
            claims = id_token.verify_oauth2_token(token, _request_adapter, audience=aud)
            uid = claims.get("sub") or claims.get("user_id")
            if uid:
                email = claims.get("email", "")
                name = claims.get("name") or (email.split("@")[0] if email else "Usuário Google")
                return {
                    "uid": uid,
                    "email": email,
                    "name": name,
                    "picture": claims.get("picture", "")
                }
        except Exception as e:
            logger.debug(f"OAuth2 ID token verification (aud={aud}) failed: {e}")

    # 3. Fallback to Google OAuth2 tokeninfo endpoint
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
            if resp.status_code == 200:
                data = resp.json()
                uid = data.get("user_id") or data.get("sub")
                if uid:
                    email = data.get("email", "")
                    name = data.get("name") or (email.split("@")[0] if email else "Usuário Google")
                    return {
                        "uid": uid,
                        "email": email,
                        "name": name,
                        "picture": data.get("picture", "")
                    }
    except Exception as e:
        logger.debug(f"Tokeninfo validation failed: {e}")

    # If all verifications fail, reject the request
    logger.warning("Rejecting unauthenticated request: Token could not be verified.")
    raise HTTPException(
        status_code=401,
        detail="Token de autenticação inválido ou expirado. Por favor, faça login com sua Conta Google."
    )
