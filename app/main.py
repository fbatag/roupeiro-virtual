import io
import os
import uuid
import logging
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import FIREBASE_CONFIG, VALID_CATEGORIES, PROJECT_ID, GEMINI_MODEL
from app.auth_middleware import get_current_user
from app.gemini_service import (
    analyze_clothing_image,
    plan_trip_and_pack,
    regenerate_look_with_prompt
)
from app.storage_service import upload_bytes, get_blob_bytes, delete_blob
from app.firestore_service import (
    create_item,
    list_items,
    get_item,
    update_item,
    delete_item,
    get_wardrobe_summary,
    get_user_categories,
    add_user_category,
    set_user_category_order,
    rename_user_category,
    delete_user_category,
    batch_move_items,
    batch_delete_items,
    create_trip,
    list_trips,
    get_trip,
    update_trip,
    delete_trip,
    duplicate_trip,
    create_shopping_item,
    list_shopping_items,
    get_shopping_item,
    update_shopping_item,
    delete_shopping_item
)
from app.photos_service import list_google_photos, download_photo_bytes
from app.prompt_mapper import PromptMapper
from app.shopping_service import ShoppingService, extract_product_from_url

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("roupeiro_virtual")

shopping_service = ShoppingService()
prompt_mapper = PromptMapper()

app = FastAPI(
    title="Roupeiro Virtual API",
    description="Armário Inteligente com Classificação Gemini e Extração de Peças de Roupa",
    version="1.0.0"
)

# Enable CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ItemUpdate(BaseModel):
    categoria: Optional[str] = None
    tipo: Optional[str] = None
    cor_predominante: Optional[str] = None
    cor_hex: Optional[str] = None
    data_aquisicao: Optional[str] = None
    descricao: Optional[str] = None
    estacao: Optional[str] = None
    estilo: Optional[str] = None
    is_generic: Optional[bool] = None
    quantidade: Optional[int] = None
    nao_repetir: Optional[bool] = None
    status_roupa: Optional[str] = None

class ItemStatusUpdateRequest(BaseModel):
    status_roupa: str

class GenericItemCreate(BaseModel):
    tipo: str
    categoria: str
    cor_predominante: Optional[str] = "Branco"
    cor_hex: Optional[str] = "#FFFFFF"
    quantidade: Optional[int] = 1
    nao_repetir: Optional[bool] = True
    descricao: Optional[str] = ""
    data_aquisicao: Optional[str] = ""
    estilo: Optional[str] = "Básico"
    estacao: Optional[str] = "Todas"

class CategoryCreateRequest(BaseModel):
    name: str

class CategoryOrderRequest(BaseModel):
    categories: list[str]

class CategoryRenameRequest(BaseModel):
    old_name: str
    new_name: str

class BatchMoveRequest(BaseModel):
    item_ids: list[str]
    target_category: str

class BatchDeleteRequest(BaseModel):
    item_ids: list[str]

class GooglePhotosQuery(BaseModel):
    access_token: str
    page_size: int = 40
    page_token: Optional[str] = None

class GooglePhotosImportItem(BaseModel):
    id: str
    baseUrl: str
    filename: Optional[str] = "foto_google.jpg"
    creationTime: Optional[str] = ""
    acquisitionDateSuggestion: Optional[str] = ""

class GooglePhotosImportRequest(BaseModel):
    items: list[GooglePhotosImportItem]
    target_category: Optional[str] = None

class TripPlanRequest(BaseModel):
    destination: str
    arrival_date: str
    arrival_time: str
    departure_date: str
    departure_time: str
    notes: Optional[str] = ""

class TripUpdateRequest(BaseModel):
    trip_data: dict

class LookRegenerateRequest(BaseModel):
    destination: str
    period_name: str
    weather: dict
    locations: list[dict]
    current_look: dict
    user_prompt: str

class ShoppingSearchRequest(BaseModel):
    query: str
    color: Optional[str] = None
    material: Optional[str] = None
    max_price: Optional[float] = None
    min_price: Optional[float] = None
    gender: Optional[str] = None
    limit: Optional[int] = 12

class ExtractProductUrlRequest(BaseModel):
    url: str

class ShoppingItemCreateRequest(BaseModel):
    title: str
    category: Optional[str] = "Outros"
    color: Optional[str] = ""
    price: Optional[str] = ""
    price_val: Optional[float] = None
    merchant: Optional[str] = ""
    link: Optional[str] = ""
    thumbnail: Optional[str] = ""
    purchased: Optional[bool] = False
    notes: Optional[str] = ""

class ShoppingItemUpdateRequest(BaseModel):
    item_data: dict

# Endpoints

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "Roupeiro Virtual", "project": PROJECT_ID}

@app.get("/api/config")
async def get_client_config(response: Response):
    """Returns Firebase, Gemini Model, and UI configuration for frontend initialization."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return {
        "firebase": FIREBASE_CONFIG,
        "categories": VALID_CATEGORIES,
        "geminiModel": GEMINI_MODEL
    }

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Returns authenticated user profile or 401 if not authenticated."""
    return user

@app.get("/api/clothes")
async def get_clothes(
    response: Response,
    category: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Lists wardrobe items for authenticated user with optional filtering."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    items = list_items(uid=user["uid"], category=category, color=color, search=search)
    return {"items": items, "count": len(items)}

@app.get("/api/wardrobe/summary")
async def wardrobe_summary(response: Response, user: dict = Depends(get_current_user)):
    """Returns wardrobe analytics and category breakdown."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    summary = get_wardrobe_summary(uid=user["uid"])
    return summary

@app.post("/api/clothes/upload")
async def upload_clothing_piece(
    file: UploadFile = File(...),
    original_path: Optional[str] = Form(None),
    categoria: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """
    Receives an uploaded photo (single file or recursive folder item),
    classifies clothing with Gemini, isolates clothing piece, and saves to wardrobe.
    If categoria is provided, it assigns directly to that category, overriding Gemini's category classification.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo de imagem vazio")

    item_id = str(uuid.uuid4())
    uid = user["uid"]
    filename = file.filename or f"foto_{item_id}.jpg"
    mime_type = file.content_type or "image/jpeg"

    logger.info(f"Processing upload: {filename} for user {uid}")

    # 1. AI Analysis with Gemini (Classification, Predominant Color, Description)
    analysis = analyze_clothing_image(content, mime_type=mime_type)

    # 2. Save original image to Google Cloud Storage
    orig_ext = os.path.splitext(filename)[1].lower() or ".jpg"
    orig_storage_path = f"users/{uid}/originals/{item_id}{orig_ext}"
    upload_bytes(content, orig_storage_path, content_type=mime_type)

    # 3. Construct URL for frontend consumption
    orig_url = f"/api/media/{orig_storage_path}"

    target_cat = categoria.strip() if categoria and categoria.strip() else None
    if target_cat:
        add_user_category(uid, target_cat)

    # 4. Persist item metadata to Firestore
    item_doc = {
        "id": item_id,
        "uid": uid,
        "user_email": user.get("email", ""),
        "original_filename": filename,
        "folder_path": original_path or "",
        "categoria": target_cat if target_cat else analysis.get("categoria", "Outros"),
        "tipo": analysis.get("tipo", "Peça de Roupa"),
        "cor_predominante": analysis.get("cor_predominante", "Não identificada"),
        "cor_hex": analysis.get("cor_hex", "#94a3b8"),
        "data_aquisicao": "",  # Initially empty as requested, can be edited later
        "descricao": analysis.get("descricao", ""),
        "estacao": analysis.get("estacao", "Todas"),
        "estilo": analysis.get("estilo", "Casual"),
        "original_image_path": orig_storage_path,
        "cutout_image_path": "",
        "original_url": orig_url,
        "cutout_url": orig_url,
        "status_roupa": "Ok",
        "source": "folder_upload" if original_path else "device_upload"
    }

    saved_item = create_item(uid, item_doc)
    logger.info(f"Item created successfully: {saved_item['id']} ({saved_item['tipo']}) in category: {saved_item['categoria']}")
    return saved_item

@app.post("/api/clothes/batch-move")
async def batch_move_endpoint(payload: BatchMoveRequest, user: dict = Depends(get_current_user)):
    """Moves multiple items to a new category at once."""
    target_category = payload.target_category.strip()
    if not target_category:
        raise HTTPException(status_code=400, detail="Categoria de destino não informada")
    add_user_category(user["uid"], target_category)
    moved_count = batch_move_items(user["uid"], payload.item_ids, target_category)
    return {"status": "ok", "moved_count": moved_count, "target_category": target_category}

@app.post("/api/clothes/batch-delete")
async def batch_delete_endpoint(payload: BatchDeleteRequest, user: dict = Depends(get_current_user)):
    """Deletes multiple items from user's wardrobe at once."""
    deleted_count = batch_delete_items(user["uid"], payload.item_ids)
    return {"status": "ok", "deleted_count": deleted_count}

@app.get("/api/categories")
async def list_categories(user: dict = Depends(get_current_user)):
    """Returns all available categories (standard and user custom) for the user."""
    cats = get_user_categories(user["uid"])
    return {"categories": cats}

@app.post("/api/categories")
async def create_category(payload: CategoryCreateRequest, user: dict = Depends(get_current_user)):
    """Creates a new custom category for the authenticated user."""
    cat_name = payload.name.strip()
    if not cat_name:
        raise HTTPException(status_code=400, detail="Nome da categoria não pode ser vazio")
    cats = add_user_category(user["uid"], cat_name)
    return {"categories": cats, "added": cat_name}

@app.put("/api/categories/order")
async def update_categories_order(payload: CategoryOrderRequest, user: dict = Depends(get_current_user)):
    """Updates user's preferred category order."""
    cats = set_user_category_order(user["uid"], payload.categories)
    return {"categories": cats}

@app.put("/api/categories/rename")
async def rename_category_endpoint(payload: CategoryRenameRequest, user: dict = Depends(get_current_user)):
    """Renames a category and migrates all user clothes in that category."""
    old_c = payload.old_name.strip()
    new_c = payload.new_name.strip()
    if not old_c or not new_c:
        raise HTTPException(status_code=400, detail="Nomes de categoria não podem ser vazios")
    cats = rename_user_category(user["uid"], old_c, new_c)
    return {"categories": cats, "renamed": {"old": old_c, "new": new_c}}

@app.delete("/api/categories/{category_name}")
async def delete_category_endpoint(category_name: str, user: dict = Depends(get_current_user)):
    """Deletes a category only if it has zero items associated with it."""
    success, msg, cats = delete_user_category(user["uid"], category_name)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"categories": cats, "message": msg}

@app.post("/api/clothes/generic")
async def create_generic_clothing_piece(
    payload: GenericItemCreate,
    user: dict = Depends(get_current_user)
):
    """
    Creates a generic clothing item (e.g. Meia Branca, Cueca Slip) with specified quantity
    and no-repeat settings, without requiring an image upload.
    """
    uid = user["uid"]
    item_id = str(uuid.uuid4())
    
    tipo = payload.tipo.strip() if payload.tipo else "Item Genérico"
    categoria = payload.categoria.strip() if payload.categoria else "Moda Íntima"
    # Ensure category is registered for user
    add_user_category(uid, categoria)
    
    item_doc = {
        "id": item_id,
        "uid": uid,
        "user_email": user.get("email", ""),
        "original_filename": f"generico_{item_id}.png",
        "folder_path": "",
        "categoria": categoria,
        "tipo": tipo,
        "cor_predominante": payload.cor_predominante or "Branco",
        "cor_hex": payload.cor_hex or "#FFFFFF",
        "data_aquisicao": payload.data_aquisicao or "",
        "descricao": payload.descricao or "",
        "estacao": payload.estacao or "Todas",
        "estilo": payload.estilo or "Básico",
        "is_generic": True,
        "quantidade": max(1, int(payload.quantidade or 1)),
        "nao_repetir": bool(payload.nao_repetir),
        "original_image_path": "",
        "cutout_image_path": "",
        "original_url": "",
        "cutout_url": "",
        "status_roupa": "Ok",
        "source": "generic_item"
    }
    
    saved_item = create_item(uid, item_doc)
    logger.info(f"Generic item created successfully: {saved_item['id']} ({saved_item['tipo']} x{saved_item['quantidade']}, nao_repetir={saved_item['nao_repetir']})")
    return saved_item

@app.post("/api/google-photos/media-items")
async def get_user_google_photos(
    query: GooglePhotosQuery,
    user: dict = Depends(get_current_user)
):
    """Fetches media items directly from user's Google Photos library."""
    try:
        photos_data = await list_google_photos(
            access_token=query.access_token,
            page_size=query.page_size,
            page_token=query.page_token
        )
        return photos_data
    except Exception as e:
        logger.error(f"Error fetching Google Photos: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/google-photos/import-batch")
async def import_from_google_photos(
    payload: GooglePhotosImportRequest,
    user: dict = Depends(get_current_user)
):
    """
    Imports selected photos from user's Google Photos into Roupeiro Virtual,
    running Gemini classification and clothing piece extraction on each.
    """
    uid = user["uid"]
    imported_items = []
    errors = []

    target_cat = payload.target_category.strip() if payload.target_category and payload.target_category.strip() else None
    if target_cat:
        add_user_category(uid, target_cat)

    for photo in payload.items:
        try:
            logger.info(f"Importing Google Photo: {photo.filename} ({photo.id})")
            # Download high-res bytes
            img_bytes = await download_photo_bytes(photo.baseUrl)
            
            # Gemini analysis
            analysis = analyze_clothing_image(img_bytes, mime_type="image/jpeg")

            # Store in GCS (original image only)
            item_id = str(uuid.uuid4())
            orig_storage_path = f"users/{uid}/originals/{item_id}.jpg"

            upload_bytes(img_bytes, orig_storage_path, content_type="image/jpeg")

            orig_url = f"/api/media/{orig_storage_path}"

            # Pre-fill acquisition date with Google Photos creation date if available
            acq_date = photo.acquisitionDateSuggestion or ""

            item_doc = {
                "id": item_id,
                "uid": uid,
                "user_email": user.get("email", ""),
                "original_filename": photo.filename,
                "categoria": target_cat if target_cat else analysis.get("categoria", "Outros"),
                "tipo": analysis.get("tipo", "Peça de Roupa"),
                "cor_predominante": analysis.get("cor_predominante", "Não identificada"),
                "cor_hex": analysis.get("cor_hex", "#94a3b8"),
                "data_aquisicao": acq_date,
                "descricao": analysis.get("descricao", "") or photo.creationTime,
                "estacao": analysis.get("estacao", "Todas"),
                "estilo": analysis.get("estilo", "Casual"),
                "original_image_path": orig_storage_path,
                "cutout_image_path": "",
                "original_url": orig_url,
                "cutout_url": orig_url,
                "status_roupa": "Ok",
                "source": "google_photos",
                "google_photos_id": photo.id
            }

            saved = create_item(uid, item_doc)
            imported_items.append(saved)

        except Exception as e:
            logger.error(f"Error importing item {photo.id}: {e}")
            errors.append({"id": photo.id, "error": str(e)})

    return {
        "imported": imported_items,
        "imported_count": len(imported_items),
        "errors": errors
    }

@app.get("/api/clothes/{item_id}")
async def get_clothing_item(item_id: str, user: dict = Depends(get_current_user)):
    item = get_item(uid=user["uid"], item_id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    return item

@app.put("/api/clothes/{item_id}")
async def update_clothing_item(
    item_id: str,
    updates: ItemUpdate,
    user: dict = Depends(get_current_user)
):
    """Updates user-editable fields (Cor, Data de Aquisição, Descrição, Categoria)."""
    update_data = updates.dict(exclude_unset=True)
    item = update_item(uid=user["uid"], item_id=item_id, updates=update_data)
    if not item:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    return item

@app.put("/api/clothes/{item_id}/status")
async def update_clothing_status(
    item_id: str,
    payload: ItemStatusUpdateRequest,
    user: dict = Depends(get_current_user)
):
    """Quickly updates the clothing piece status (Ok, Passar, Lavar, Lavanderia, Emprestada, Achar)."""
    valid_statuses = ["Ok", "Passar", "Lavar", "Lavanderia", "Emprestada", "Achar"]
    st = payload.status_roupa.strip()
    if st not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status inválido. Valores aceitos: {', '.join(valid_statuses)}")
    item = update_item(uid=user["uid"], item_id=item_id, updates={"status_roupa": st})
    if not item:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    return item

@app.delete("/api/clothes/{item_id}")
async def delete_clothing_item(item_id: str, user: dict = Depends(get_current_user)):
    item = delete_item(uid=user["uid"], item_id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Peça não encontrada")

    # Clean up files in GCS
    if item.get("original_image_path"):
        delete_blob(item["original_image_path"])
    if item.get("cutout_image_path"):
        delete_blob(item["cutout_image_path"])

    return {"status": "deleted", "id": item_id}

@app.get("/api/media/{file_path:path}")
async def serve_media(file_path: str):
    """Streams images from Cloud Storage with cache headers."""
    try:
        data, content_type = get_blob_bytes(file_path)
        return Response(
            content=data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": "inline"
            }
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    except Exception as e:
        logger.error(f"Error serving media {file_path}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar imagem")

# -------------------------------------------------------------
# Trip Planning ("Faça Minha Mala") Endpoints
# -------------------------------------------------------------

@app.post("/api/trips/plan")
async def create_trip_plan(
    payload: TripPlanRequest,
    user: dict = Depends(get_current_user)
):
    """
    Generates a full day-by-day and night-by-night trip plan with travel times,
    weather forecasts, and outfits assembled from user's wardrobe using Gemini.
    """
    uid = user["uid"]
    logger.info(f"Generating trip plan for user {uid}: {payload.destination} ({payload.arrival_date} to {payload.departure_date})")

    # Fetch user's wardrobe items
    wardrobe_items = list_items(uid)

    try:
        trip_plan = plan_trip_and_pack(
            destination=payload.destination,
            arrival_date=payload.arrival_date,
            arrival_time=payload.arrival_time,
            departure_date=payload.departure_date,
            departure_time=payload.departure_time,
            notes=payload.notes or "",
            wardrobe_items=wardrobe_items
        )

        trip_doc = {
            "destination": payload.destination,
            "arrival_date": payload.arrival_date,
            "arrival_time": payload.arrival_time,
            "departure_date": payload.departure_date,
            "departure_time": payload.departure_time,
            "notes": payload.notes or "",
            "summary": trip_plan.get("summary", ""),
            "total_days": trip_plan.get("total_days", len(trip_plan.get("days", []))),
            "days": trip_plan.get("days", []),
            "packing_tips": trip_plan.get("packing_tips", ""),
            "suggested_essentials": trip_plan.get("suggested_essentials", [])
        }

        saved_trip = create_trip(uid, trip_doc)
        return saved_trip

    except Exception as e:
        logger.error(f"Error creating trip plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trips")
async def get_user_trips(response: Response, user: dict = Depends(get_current_user)):
    """Lists saved trips for authenticated user."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    trips = list_trips(user["uid"])
    return {"trips": trips, "count": len(trips)}

@app.get("/api/trips/{trip_id}")
async def get_single_trip(trip_id: str, response: Response, user: dict = Depends(get_current_user)):
    """Fetches full details of a specific trip plan."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    trip = get_trip(user["uid"], trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Viagem não encontrada")
    return trip

@app.put("/api/trips/{trip_id}")
async def update_single_trip(
    trip_id: str,
    payload: TripUpdateRequest,
    user: dict = Depends(get_current_user)
):
    """Updates an existing trip (e.g. after moving locations or swapping look items)."""
    updated = update_trip(user["uid"], trip_id, payload.trip_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Viagem não encontrada")
    return updated

@app.delete("/api/trips/{trip_id}")
async def delete_single_trip(trip_id: str, user: dict = Depends(get_current_user)):
    """Deletes a saved trip."""
    success = delete_trip(user["uid"], trip_id)
    if not success:
        raise HTTPException(status_code=404, detail="Viagem não encontrada")
    return {"status": "deleted", "id": trip_id}

@app.post("/api/trips/{trip_id}/duplicate")
async def duplicate_single_trip(trip_id: str, user: dict = Depends(get_current_user)):
    """Duplicates a saved trip and returns the newly created copy."""
    dup = duplicate_trip(user["uid"], trip_id)
    if not dup:
        raise HTTPException(status_code=404, detail="Viagem não encontrada")
    return dup

@app.put("/api/trips/{trip_id}/lock")
async def lock_single_trip(trip_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Locks or unlocks a trip plan against accidental edits."""
    is_locked = bool(payload.get("is_locked", False))
    updated = update_trip(user["uid"], trip_id, {"is_locked": is_locked})
    if not updated:
        raise HTTPException(status_code=404, detail="Viagem não encontrada")
    return updated

@app.post("/api/trips/regenerate-look")
async def regenerate_look_endpoint(
    payload: LookRegenerateRequest,
    user: dict = Depends(get_current_user)
):
    """
    Regenerates a specific look via Gemini according to user's text or spoken voice prompt,
    matching against the user's available wardrobe.
    """
    uid = user["uid"]
    wardrobe_items = list_items(uid)

    try:
        new_look = regenerate_look_with_prompt(
            destination=payload.destination,
            period_name=payload.period_name,
            weather=payload.weather,
            locations=payload.locations,
            current_look=payload.current_look,
            user_prompt=payload.user_prompt,
            wardrobe_items=wardrobe_items
        )
        return new_look
    except Exception as e:
        logger.error(f"Error in regenerate_look_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# SHOPPING & COMPRAS ENDPOINTS
# =============================================================================

@app.post("/api/shopping/search")
async def shopping_search(payload: ShoppingSearchRequest, user: dict = Depends(get_current_user)):
    """Executes Google Shopping and live retail search with prompt mapping."""
    try:
        raw_query = payload.query.strip()
        query_lower = raw_query.lower()
        terms = [raw_query]
        if payload.color and payload.color.lower() not in query_lower:
            terms.append(payload.color)
        if payload.material and payload.material.lower() not in query_lower:
            terms.append(payload.material)
        if payload.gender and payload.gender.lower() not in query_lower:
            terms.append(payload.gender)

        full_prompt = " ".join(terms)
        mapped = prompt_mapper.map_prompt(full_prompt, gender=payload.gender)
        if payload.gender:
            mapped["gender"] = payload.gender

        if payload.min_price is not None or payload.max_price is not None:
            mapped["price_filter"] = {
                "min": payload.min_price,
                "max": payload.max_price
            }

        products = shopping_service.search(mapped, limit=payload.limit or 12)
        return {
            "prompt": full_prompt,
            "mapped_query": mapped,
            "count": len(products),
            "products": products
        }
    except Exception as e:
        logger.error(f"Shopping search error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na busca do Google Shopping: {e}")

@app.post("/api/shopping/extract-product")
async def shopping_extract_product(payload: ExtractProductUrlRequest, user: dict = Depends(get_current_user)):
    """Extracts product details (title, price, store, image) from an external product URL."""
    url = payload.url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    try:
        product = shopping_service.extract_product_from_url(url)
        return {
            "success": True,
            "product": product
        }
    except Exception as e:
        logger.error(f"Error extracting product from URL {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao extrair dados do produto: {e}")

@app.get("/api/shopping/catalog")
async def get_shopping_catalog(response: Response, user: dict = Depends(get_current_user)):
    """Lists saved shopping items for the authenticated user."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    items = list_shopping_items(user["uid"])
    return {"items": items, "count": len(items)}

@app.post("/api/shopping/catalog")
async def add_item_to_shopping_catalog(payload: ShoppingItemCreateRequest, user: dict = Depends(get_current_user)):
    """Adds a new item to the user's shopping catalog."""
    item_doc = payload.model_dump()
    created = create_shopping_item(user["uid"], item_doc)
    return created

@app.put("/api/shopping/catalog/{item_id}")
async def update_shopping_catalog_item(item_id: str, payload: ShoppingItemUpdateRequest, user: dict = Depends(get_current_user)):
    """Updates a shopping catalog item (e.g. marked as purchased)."""
    updated = update_shopping_item(user["uid"], item_id, payload.item_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Item de compra não encontrado")
    return updated

@app.delete("/api/shopping/catalog/{item_id}")
async def delete_shopping_catalog_item(item_id: str, user: dict = Depends(get_current_user)):
    """Deletes an item from the user's shopping catalog."""
    success = delete_shopping_item(user["uid"], item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item de compra não encontrado")
    return {"status": "deleted", "id": item_id}

# Mount static frontend
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/viagem")
@app.get("/viagem.html")
@app.head("/viagem")
@app.head("/viagem.html")
async def viagem_page():
    viagem_file = os.path.join(static_dir, "viagem.html")
    if os.path.exists(viagem_file):
        return FileResponse(viagem_file, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return FileResponse(os.path.join(static_dir, "index.html"), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

@app.get("/")
@app.head("/")
async def root():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"message": "Roupeiro Virtual backend is running"}

@app.get("/privacy")
@app.get("/privacy.html")
@app.get("/politica-privacidade")
@app.head("/privacy")
@app.head("/privacy.html")
@app.head("/politica-privacidade")
async def privacy_policy():
    """Serves public privacy policy for Google OAuth and user privacy transparency."""
    privacy_file = os.path.join(static_dir, "privacy.html")
    if os.path.exists(privacy_file):
        return FileResponse(privacy_file)
    return {"message": "Política de Privacidade do Roupeiro Virtual"}

@app.get("/terms")
@app.get("/terms.html")
@app.get("/termos")
@app.head("/terms")
@app.head("/terms.html")
@app.head("/termos")
async def terms_of_service():
    """Serves public terms of service for Google OAuth compliance."""
    terms_file = os.path.join(static_dir, "terms.html")
    if os.path.exists(terms_file):
        return FileResponse(terms_file)
    return {"message": "Termos de Serviço do Roupeiro Virtual"}
