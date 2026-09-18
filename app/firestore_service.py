import logging
import uuid
from datetime import datetime
from google.cloud import firestore
from app.config import PROJECT_ID

logger = logging.getLogger(__name__)

_firestore_client = None

def get_db():
    global _firestore_client
    if _firestore_client is None:
        _firestore_client = firestore.Client(project=PROJECT_ID)
    return _firestore_client

def get_clothes_collection(uid: str):
    db = get_db()
    return db.collection("users").document(uid).collection("clothes")

def create_item(uid: str, data: dict) -> dict:
    coll = get_clothes_collection(uid)
    item_id = data.get("id") or str(uuid.uuid4())
    data["id"] = item_id
    data["uid"] = uid
    data["created_at"] = firestore.SERVER_TIMESTAMP
    data["updated_at"] = firestore.SERVER_TIMESTAMP
    
    # Ensure default fields
    data.setdefault("data_aquisicao", "")
    data.setdefault("preco_pago", "")
    data.setdefault("loja_comprada", "")
    data.setdefault("descricao", "")
    data.setdefault("cor_predominante", "Não identificada")
    data.setdefault("cor_hex", "#94a3b8")
    data.setdefault("categoria", "Outros")
    data.setdefault("tipo", "Peça de Roupa")
    data.setdefault("is_generic", False)
    data.setdefault("quantidade", 1)
    data.setdefault("nao_repetir", False)
    data.setdefault("status_roupa", "Ok")
    
    doc_ref = coll.document(item_id)
    doc_ref.set(data)
    
    # Return document data with iso timestamps
    ret = dict(data)
    ret["created_at"] = datetime.utcnow().isoformat()
    ret["updated_at"] = datetime.utcnow().isoformat()
    return ret

def list_items(uid: str, category: str = None, color: str = None, search: str = None) -> list[dict]:
    coll = get_clothes_collection(uid)
    docs = coll.stream()
    items = []

    # Parse category filter (supports comma-separated multiple categories)
    allowed_cats = None
    if category and category != "Todas":
        cats = [c.strip() for c in category.split(",") if c.strip()]
        if cats and "Todas" not in cats:
            allowed_cats = set(cats)

    for doc in docs:
        d = doc.to_dict()
        # Convert timestamp objects to ISO strings
        for k in ["created_at", "updated_at"]:
            if k in d and d[k] is not None:
                if hasattr(d[k], "isoformat"):
                    d[k] = d[k].isoformat()
                else:
                    d[k] = str(d[k])
        # Automatic migration of legacy "Moda Praia & Íntima" category
        if d.get("categoria") == "Moda Praia & Íntima":
            tipo_desc = f"{d.get('tipo', '')} {d.get('descricao', '')}".lower()
            if any(w in tipo_desc for w in ["sunga", "biquíni", "biquini", "maiô", "maio", "praia", "canga", "saída"]):
                new_cat = "Moda Praia"
            else:
                new_cat = "Moda Íntima"
            d["categoria"] = new_cat
            try:
                coll.document(doc.id).update({"categoria": new_cat})
            except Exception as e:
                logger.warning(f"Could not update legacy category for {doc.id}: {e}")

        # In-memory category filtering (avoids Firestore composite index error)
        if allowed_cats is not None and d.get("categoria") not in allowed_cats:
            continue

        # In-memory filtering for color or text search if requested
        if color and color.lower() not in d.get("cor_predominante", "").lower():
            continue
        if search:
            s = search.lower()
            text = f"{d.get('categoria','')} {d.get('tipo','')} {d.get('descricao','')} {d.get('cor_predominante','')}".lower()
            if s not in text:
                continue

        d.setdefault("status_roupa", "Ok")
        items.append(d)

    # Sort items by created_at descending in memory
    items.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return items

def get_item(uid: str, item_id: str) -> dict | None:
    doc_ref = get_clothes_collection(uid).document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    d = doc.to_dict()
    d.setdefault("status_roupa", "Ok")
    for k in ["created_at", "updated_at"]:
        if k in d and d[k] is not None and hasattr(d[k], "isoformat"):
            d[k] = d[k].isoformat()
    return d

def update_item(uid: str, item_id: str, updates: dict) -> dict | None:
    doc_ref = get_clothes_collection(uid).document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    
    # Only allow updating user-editable fields
    allowed = [
        "categoria", "tipo", "cor_predominante", "cor_hex", "data_aquisicao",
        "preco_pago", "loja_comprada",
        "descricao", "estacao", "estilo", "is_generic", "quantidade", "nao_repetir",
        "status_roupa"
    ]
    filtered_updates = {k: v for k, v in updates.items() if k in allowed}
    filtered_updates["updated_at"] = firestore.SERVER_TIMESTAMP
    
    doc_ref.update(filtered_updates)
    return get_item(uid, item_id)

def remove_items_from_all_trips(uid: str, deleted_item_ids: list[str]) -> int:
    """
    Removes references to deleted wardrobe items from all user trips (looks and mala).
    Ensures that when a piece is deleted from wardrobe, it is automatically removed from trips.
    """
    if not deleted_item_ids:
        return 0
    del_set = set(deleted_item_ids)
    trips_coll = get_trips_collection(uid)
    trips_docs = trips_coll.stream()
    modified_trips_count = 0

    for doc in trips_docs:
        trip = doc.to_dict()
        trip_modified = False
        days = trip.get("days", [])
        for day in days:
            for p_key in ["day_period", "night_period"]:
                period = day.get(p_key)
                if not period or not isinstance(period, dict):
                    continue
                look = period.get("look")
                if not look or not isinstance(look, dict):
                    continue
                items = look.get("items", [])
                if not isinstance(items, list):
                    continue
                new_items = []
                for it in items:
                    if isinstance(it, dict) and it.get("item_id") in del_set:
                        trip_modified = True
                        continue
                    new_items.append(it)
                if len(new_items) != len(items):
                    look["items"] = new_items
                    look["item_ids"] = [i["item_id"] for i in new_items if isinstance(i, dict) and i.get("item_id")]

        if trip_modified:
            trips_coll.document(doc.id).update({
                "days": days,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            modified_trips_count += 1
            logger.info(f"Updated trip {doc.id} after removing deleted clothes: {del_set}")

    return modified_trips_count

def delete_item(uid: str, item_id: str) -> dict | None:
    doc_ref = get_clothes_collection(uid).document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    d = doc.to_dict()
    doc_ref.delete()
    try:
        remove_items_from_all_trips(uid, [item_id])
    except Exception as e:
        logger.error(f"Error removing item {item_id} from trips: {e}")
    return d

def batch_move_items(uid: str, item_ids: list[str], target_category: str) -> int:
    if not item_ids or not target_category:
        return 0
    coll = get_clothes_collection(uid)
    db = get_db()
    count = 0
    for i in range(0, len(item_ids), 500):
        batch = db.batch()
        chunk = item_ids[i:i+500]
        for item_id in chunk:
            doc_ref = coll.document(item_id)
            batch.update(doc_ref, {
                "categoria": target_category,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            count += 1
        batch.commit()
    return count

def batch_delete_items(uid: str, item_ids: list[str]) -> int:
    if not item_ids:
        return 0
    coll = get_clothes_collection(uid)
    db = get_db()
    count = 0
    for i in range(0, len(item_ids), 500):
        batch = db.batch()
        chunk = item_ids[i:i+500]
        for item_id in chunk:
            doc_ref = coll.document(item_id)
            batch.delete(doc_ref)
            count += 1
        batch.commit()
    try:
        remove_items_from_all_trips(uid, item_ids)
    except Exception as e:
        logger.error(f"Error removing batch items from trips: {e}")
    return count

def get_user_categories(uid: str) -> list[str]:
    from app.config import VALID_CATEGORIES
    db = get_db()
    user_doc = db.collection("users").document(uid).get()
    data = user_doc.to_dict() or {} if user_doc.exists else {}
    custom_cats = [c for c in data.get("custom_categories", []) if c and c != "Moda Praia & Íntima"]
    deleted_cats = set(data.get("deleted_categories", []))
    deleted_cats.add("Moda Praia & Íntima")

    # Also collect categories from user's clothes
    clothes_coll = get_clothes_collection(uid)
    clothes_cats = set()
    for doc in clothes_coll.stream():
        c = doc.to_dict().get("categoria")
        if c and c != "Moda Praia & Íntima":
            clothes_cats.add(c)

    # Base list of categories available to this user
    all_available = [c for c in VALID_CATEGORIES if c not in deleted_cats]
    for cat in custom_cats:
        if cat not in all_available and cat not in deleted_cats:
            all_available.append(cat)
    for cat in clothes_cats:
        if cat not in all_available:
            all_available.append(cat)

    # Order categories according to user's preference if set
    saved_order = data.get("category_order", [])
    if saved_order:
        ordered_result = []
        for cat in saved_order:
            if cat in all_available and cat not in ordered_result:
                ordered_result.append(cat)
        for cat in all_available:
            if cat not in ordered_result:
                ordered_result.append(cat)
        return ordered_result

    return all_available

def add_user_category(uid: str, category_name: str) -> list[str]:
    cat = category_name.strip()
    if not cat:
        return get_user_categories(uid)
    db = get_db()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    data = user_doc.to_dict() or {} if user_doc.exists else {}
    custom_cats = data.get("custom_categories", [])
    cat_order = data.get("category_order", [])
    deleted_cats = [c for c in data.get("deleted_categories", []) if c != cat]

    if cat not in custom_cats:
        custom_cats.append(cat)
    if cat not in cat_order:
        cat_order.append(cat)

    user_ref.set({
        "custom_categories": custom_cats,
        "category_order": cat_order,
        "deleted_categories": deleted_cats
    }, merge=True)
    return get_user_categories(uid)

def set_user_category_order(uid: str, categories: list[str]) -> list[str]:
    clean_cats = [c.strip() for c in categories if c and c.strip() != "Todas"]
    db = get_db()
    user_ref = db.collection("users").document(uid)
    user_ref.set({"category_order": clean_cats}, merge=True)
    return get_user_categories(uid)

def rename_user_category(uid: str, old_name: str, new_name: str) -> list[str]:
    old_c = old_name.strip()
    new_c = new_name.strip()
    if not old_c or not new_c or old_c == new_c:
        return get_user_categories(uid)

    db = get_db()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    data = user_doc.to_dict() or {} if user_doc.exists else {}

    custom_cats = data.get("custom_categories", [])
    if old_c in custom_cats:
        custom_cats = [new_c if c == old_c else c for c in custom_cats]
    else:
        custom_cats.append(new_c)

    cat_order = data.get("category_order", [])
    if old_c in cat_order:
        cat_order = [new_c if c == old_c else c for c in cat_order]
    elif new_c not in cat_order:
        cat_order.append(new_c)

    deleted_cats = [c for c in data.get("deleted_categories", []) if c != new_c]

    user_ref.set({
        "custom_categories": custom_cats,
        "category_order": cat_order,
        "deleted_categories": deleted_cats
    }, merge=True)

    # Update all clothes docs with old_c
    clothes_coll = get_clothes_collection(uid)
    for doc in clothes_coll.stream():
        if doc.to_dict().get("categoria") == old_c:
            clothes_coll.document(doc.id).update({"categoria": new_c})

    return get_user_categories(uid)

def delete_user_category(uid: str, category_name: str) -> tuple[bool, str, list[str]]:
    cat = category_name.strip()
    if not cat or cat == "Todas":
        return False, "Categoria inválida", get_user_categories(uid)

    clothes_coll = get_clothes_collection(uid)
    # Count pieces in this category
    count = 0
    for doc in clothes_coll.stream():
        if doc.to_dict().get("categoria") == cat:
            count += 1

    if count > 0:
        return False, f"Não é possível excluir a categoria '{cat}': ela possui {count} peças vinculadas.", get_user_categories(uid)

    db = get_db()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    data = user_doc.to_dict() or {} if user_doc.exists else {}

    custom_cats = [c for c in data.get("custom_categories", []) if c != cat]
    cat_order = [c for c in data.get("category_order", []) if c != cat]
    deleted_cats = list(set(data.get("deleted_categories", []) + [cat]))

    user_ref.set({
        "custom_categories": custom_cats,
        "category_order": cat_order,
        "deleted_categories": deleted_cats
    }, merge=True)

    return True, f"Categoria '{cat}' excluída com sucesso.", get_user_categories(uid)

def get_wardrobe_summary(uid: str) -> dict:
    items = list_items(uid)
    categories = {}
    colors = {}
    total = len(items)
    for it in items:
        cat = it.get("categoria", "Outros")
        categories[cat] = categories.get(cat, 0) + 1
        cor = it.get("cor_predominante", "Indefinida")
        colors[cor] = colors.get(cor, 0) + 1
    return {
        "total_items": total,
        "categories": categories,
        "colors": colors,
        "user_categories": get_user_categories(uid)
    }

def get_trips_collection(uid: str):
    db = get_db()
    return db.collection("users").document(uid).collection("trips")

def create_trip(uid: str, trip_data: dict) -> dict:
    coll = get_trips_collection(uid)
    trip_id = trip_data.get("id") or str(uuid.uuid4())
    trip_data["id"] = trip_id
    trip_data["uid"] = uid
    trip_data["created_at"] = firestore.SERVER_TIMESTAMP
    trip_data["updated_at"] = firestore.SERVER_TIMESTAMP

    doc_ref = coll.document(trip_id)
    doc_ref.set(trip_data)

    ret = dict(trip_data)
    ret["created_at"] = datetime.utcnow().isoformat()
    ret["updated_at"] = datetime.utcnow().isoformat()
    return ret

def list_trips(uid: str) -> list[dict]:
    coll = get_trips_collection(uid)
    query = coll.order_by("created_at", direction=firestore.Query.DESCENDING)
    docs = query.stream()
    trips = []
    for doc in docs:
        d = doc.to_dict()
        for k in ["created_at", "updated_at"]:
            if k in d and d[k] is not None:
                if hasattr(d[k], "isoformat"):
                    d[k] = d[k].isoformat()
                else:
                    d[k] = str(d[k])
        trips.append(d)
    return trips

def get_trip(uid: str, trip_id: str) -> dict | None:
    doc_ref = get_trips_collection(uid).document(trip_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    d = doc.to_dict()
    for k in ["created_at", "updated_at"]:
        if k in d and d[k] is not None and hasattr(d[k], "isoformat"):
            d[k] = d[k].isoformat()
    return d

def update_trip(uid: str, trip_id: str, updates: dict) -> dict | None:
    doc_ref = get_trips_collection(uid).document(trip_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None

    updates["updated_at"] = firestore.SERVER_TIMESTAMP
    doc_ref.update(updates)
    return get_trip(uid, trip_id)

def delete_trip(uid: str, trip_id: str) -> bool:
    doc_ref = get_trips_collection(uid).document(trip_id)
    doc = doc_ref.get()
    if not doc.exists:
        return False
    doc_ref.delete()
    return True

def duplicate_trip(uid: str, trip_id: str) -> dict | None:
    import copy
    original = get_trip(uid, trip_id)
    if not original:
        return None
    new_trip = copy.deepcopy(original)
    new_id = str(uuid.uuid4())
    new_trip["id"] = new_id
    dest = original.get("destination", "Viagem")
    new_trip["destination"] = f"{dest} (Cópia)"
    new_trip["is_locked"] = False
    new_trip.pop("created_at", None)
    new_trip.pop("updated_at", None)
    return create_trip(uid, new_trip)

# ==========================================
# CATÁLOGO DE PEÇAS A COMPRAR (SHOPPING)
# ==========================================

def get_shopping_collection(uid: str):
    db = get_db()
    return db.collection("users").document(uid).collection("shopping_items")

def create_shopping_item(uid: str, item_data: dict) -> dict:
    coll = get_shopping_collection(uid)
    item_id = item_data.get("id") or str(uuid.uuid4())
    item_data["id"] = item_id
    item_data["uid"] = uid
    if "purchased" not in item_data:
        item_data["purchased"] = False
    item_data["created_at"] = firestore.SERVER_TIMESTAMP
    item_data["updated_at"] = firestore.SERVER_TIMESTAMP

    doc_ref = coll.document(item_id)
    doc_ref.set(item_data)

    ret = dict(item_data)
    ret["created_at"] = datetime.utcnow().isoformat()
    ret["updated_at"] = datetime.utcnow().isoformat()
    return ret

def list_shopping_items(uid: str) -> list[dict]:
    coll = get_shopping_collection(uid)
    query = coll.order_by("created_at", direction=firestore.Query.DESCENDING)
    docs = query.stream()
    items = []
    for doc in docs:
        d = doc.to_dict()
        for k in ["created_at", "updated_at"]:
            if k in d and d[k] is not None:
                if hasattr(d[k], "isoformat"):
                    d[k] = d[k].isoformat()
                else:
                    d[k] = str(d[k])
        items.append(d)
    return items

def get_shopping_item(uid: str, item_id: str) -> dict | None:
    doc_ref = get_shopping_collection(uid).document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    d = doc.to_dict()
    for k in ["created_at", "updated_at"]:
        if k in d and d[k] is not None and hasattr(d[k], "isoformat"):
            d[k] = d[k].isoformat()
    return d

def update_shopping_item(uid: str, item_id: str, updates: dict) -> dict | None:
    doc_ref = get_shopping_collection(uid).document(item_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
    updates["updated_at"] = firestore.SERVER_TIMESTAMP
    doc_ref.update(updates)
    return get_shopping_item(uid, item_id)

def delete_shopping_item(uid: str, item_id: str) -> bool:
    doc_ref = get_shopping_collection(uid).document(item_id)
    doc = doc_ref.get()
    title = ""
    if doc.exists:
        d = doc.to_dict() or {}
        title = d.get("title", "")
        doc_ref.delete()
    try:
        remove_shopping_item_across_trips(uid, shopping_id=item_id, shopping_title=title)
    except Exception as e:
        logger.error(f"Error removing shopping item {item_id} across trips: {e}")
    return True

def remove_shopping_item_across_trips(
    uid: str,
    shopping_id: str | None = None,
    shopping_title: str | None = None
) -> int:
    """
    Deletes matching shopping catalog items and removes all references to a shopping piece
    across all user trips (viagens).
    """
    shop_coll = get_shopping_collection(uid)
    if shopping_id:
        doc_ref = shop_coll.document(shopping_id)
        if doc_ref.get().exists:
            doc_ref.delete()
    if shopping_title:
        target_title = shopping_title.strip().lower()
        for sdoc in shop_coll.stream():
            sd = sdoc.to_dict() or {}
            if (sd.get("title") or "").strip().lower() == target_title:
                shop_coll.document(sdoc.id).delete()

    coll = get_trips_collection(uid)
    docs = coll.stream()
    updated_count = 0
    target_title_lower = (shopping_title or "").strip().lower()

    for doc in docs:
        trip = doc.to_dict()
        days = trip.get("days") or []
        trip_modified = False

        for day in days:
            for period_key in ["day_period", "night_period"]:
                period = day.get(period_key)
                if not period or not isinstance(period, dict):
                    continue
                look = period.get("look")
                if not look or not isinstance(look, dict):
                    continue
                items = look.get("items") or []
                new_items = []
                for slot in items:
                    if not isinstance(slot, dict):
                        new_items.append(slot)
                        continue
                    is_shopping = slot.get("source_type") == "shopping" or bool(slot.get("merchant")) or bool(slot.get("shopping_id"))
                    if not is_shopping:
                        new_items.append(slot)
                        continue

                    matches_id = bool(shopping_id and slot.get("shopping_id") == shopping_id)
                    matches_title = bool(target_title_lower and (slot.get("tipo") or "").strip().lower() == target_title_lower)
                    if matches_id or matches_title:
                        trip_modified = True
                        continue
                    new_items.append(slot)

                if len(new_items) != len(items):
                    look["items"] = new_items
                    look["item_ids"] = [
                        s["item_id"]
                        for s in new_items
                        if isinstance(s, dict) and s.get("source_type") != "shopping" and s.get("item_id")
                    ]

        if trip_modified:
            coll.document(doc.id).update({
                "days": days,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            updated_count += 1

    return updated_count

def convert_shopping_to_wardrobe_across_trips(
    uid: str,
    shopping_id: str | None,
    shopping_title: str,
    new_wardrobe_item: dict
) -> int:
    """
    Converts all references to a purchased shopping piece across all user trips
    into the newly created wardrobe item.
    """
    coll = get_trips_collection(uid)
    docs = coll.stream()
    updated_count = 0

    for doc in docs:
        trip = doc.to_dict()
        days = trip.get("days") or []
        trip_modified = False

        for day in days:
            for period_key in ["day_period", "night_period"]:
                period = day.get(period_key)
                if not period or not isinstance(period, dict):
                    continue
                look = period.get("look")
                if not look or not isinstance(look, dict):
                    continue
                items = look.get("items") or []
                for slot in items:
                    if not isinstance(slot, dict):
                        continue
                    is_shopping = slot.get("source_type") == "shopping" or bool(slot.get("merchant")) or bool(slot.get("shopping_id"))
                    if not is_shopping:
                        continue

                    matches_id = bool(shopping_id and slot.get("shopping_id") == shopping_id)
                    matches_title = bool(shopping_title and (slot.get("tipo") or "").strip().lower() == shopping_title.strip().lower())
                    if matches_id or matches_title:
                        slot["source_type"] = "wardrobe"
                        slot["item_id"] = new_wardrobe_item["id"]
                        slot["tipo"] = new_wardrobe_item["tipo"]
                        slot["categoria"] = new_wardrobe_item.get("categoria", slot.get("categoria", "Outros"))
                        slot["cor"] = new_wardrobe_item.get("cor_predominante", slot.get("cor", "Padrão"))
                        slot["original_url"] = new_wardrobe_item.get("original_url", "")
                        slot["cutout_url"] = new_wardrobe_item.get("cutout_url", new_wardrobe_item.get("original_url", ""))
                        slot["shopping_id"] = None
                        slot["shopping_item_id"] = None
                        slot["merchant"] = None
                        slot["price"] = None
                        slot["link"] = None
                        slot["thumbnail"] = None
                        trip_modified = True

                if trip_modified:
                    look["item_ids"] = [
                        s["item_id"]
                        for s in items
                        if isinstance(s, dict) and s.get("source_type") != "shopping" and s.get("item_id")
                    ]

        if trip_modified:
            coll.document(doc.id).update({
                "days": days,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            updated_count += 1

    return updated_count


def register_user_profile(uid: str, email: str, name: str = "", picture: str = "") -> None:
    """Upserts authenticated user profile in Firestore users collection for discovery."""
    if not uid or not email:
        return
    try:
        db = get_db()
        db.collection("users").document(uid).set({
            "uid": uid,
            "email": email.strip(),
            "email_lower": email.strip().lower(),
            "name": name or email.split("@")[0],
            "picture": picture or "",
            "last_seen_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
    except Exception as e:
        logger.warning(f"Could not upsert user profile for {uid}: {e}")


def find_registered_user_by_email(email: str) -> dict | None:
    """
    Checks if an email belongs to an already-registered user in the application.
    1. Queries Firebase Auth / Google Identity Toolkit (accounts:lookup).
    2. Checks Firestore 'users' collection and subcollections as fallback.
    """
    if not email or "@" not in email:
        return None
    target_email = email.strip()
    target_lower = target_email.lower()

    # 1. Check Firebase Authentication via Identity Toolkit API
    try:
        import google.auth
        from google.auth.transport.requests import Request
        import httpx

        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(Request())
        resp = httpx.post(
            f"https://identitytoolkit.googleapis.com/v1/projects/{PROJECT_ID}/accounts:lookup",
            headers={
                "Authorization": f"Bearer {creds.token}",
                "x-goog-user-project": PROJECT_ID
            },
            json={"email": [target_email]},
            timeout=8.0
        )
        if resp.status_code == 200:
            users_list = resp.json().get("users", [])
            if users_list:
                u = users_list[0]
                found_uid = u.get("localId")
                found_email = u.get("email", target_email)
                found_name = u.get("displayName") or found_email.split("@")[0]
                found_pic = u.get("photoUrl", "")
                if found_uid:
                    register_user_profile(found_uid, found_email, found_name, found_pic)
                    return {
                        "uid": found_uid,
                        "email": found_email,
                        "name": found_name,
                        "picture": found_pic
                    }
    except Exception as e:
        logger.warning(f"Identity Toolkit lookup failed for {target_email}: {e}")

    # 2. Fallback: Check Firestore 'users' collection
    db = get_db()
    try:
        matches = list(db.collection("users").where("email_lower", "==", target_lower).limit(1).stream())
        if matches:
            d = matches[0].to_dict()
            return {
                "uid": d.get("uid") or matches[0].id,
                "email": d.get("email", target_email),
                "name": d.get("name") or target_email.split("@")[0],
                "picture": d.get("picture", "")
            }
    except Exception as e:
        logger.warning(f"Firestore users query failed: {e}")

    # 3. Deep Fallback: Scan existing user document references and clothes subcollections
    try:
        for user_ref in db.collection("users").list_documents():
            snap = user_ref.get()
            if snap.exists:
                ud = snap.to_dict() or {}
                if (ud.get("email") or "").strip().lower() == target_lower:
                    return {
                        "uid": user_ref.id,
                        "email": ud.get("email", target_email),
                        "name": ud.get("name") or target_email.split("@")[0],
                        "picture": ud.get("picture", "")
                    }
            # Check first clothing item for user_email
            clothes_sample = list(user_ref.collection("clothes").limit(1).stream())
            if clothes_sample:
                cd = clothes_sample[0].to_dict() or {}
                if (cd.get("user_email") or "").strip().lower() == target_lower:
                    register_user_profile(user_ref.id, cd.get("user_email", target_email))
                    return {
                        "uid": user_ref.id,
                        "email": cd.get("user_email", target_email),
                        "name": target_email.split("@")[0],
                        "picture": ""
                    }
    except Exception as e:
        logger.warning(f"Deep user lookup failed: {e}")

    return None


def create_wardrobe_export(
    sender: dict,
    target_user: dict,
    item_ids: list[str] | None = None,
    message: str = ""
) -> dict:
    """
    Creates a pending wardrobe export from sender to target_user.
    """
    sender_uid = sender["uid"]
    all_items = list_items(sender_uid)
    if item_ids:
        allowed_ids = set(item_ids)
        selected_items = [i for i in all_items if i.get("id") in allowed_ids]
    else:
        selected_items = all_items

    if not selected_items:
        raise ValueError("Nenhuma peça encontrada no guarda-roupa para exportar.")

    categories_summary = {}
    items_snapshot = []
    for it in selected_items:
        cat = it.get("categoria", "Outros")
        categories_summary[cat] = categories_summary.get(cat, 0) + 1
        orig_url = it.get("original_image_url") or it.get("original_url") or ""
        cut_url = it.get("cutout_image_url") or it.get("cutout_url") or orig_url
        items_snapshot.append({
            "id": it.get("id"),
            "categoria": cat,
            "tipo": it.get("tipo", "Peça de Roupa"),
            "cor_predominante": it.get("cor_predominante", "Não identificada"),
            "cor_hex": it.get("cor_hex", "#94a3b8"),
            "descricao": it.get("descricao", ""),
            "estacao": it.get("estacao", "Todas"),
            "estilo": it.get("estilo", "Casual"),
            "data_aquisicao": it.get("data_aquisicao", ""),
            "preco_pago": it.get("preco_pago", ""),
            "loja_comprada": it.get("loja_comprada", ""),
            "is_generic": bool(it.get("is_generic", False)),
            "quantidade": it.get("quantidade", 1),
            "nao_repetir": bool(it.get("nao_repetir", False)),
            "status_roupa": it.get("status_roupa", "Ok"),
            "original_image_path": it.get("original_image_path", ""),
            "cutout_image_path": it.get("cutout_image_path", ""),
            "original_image_url": orig_url,
            "cutout_image_url": cut_url,
            "original_url": orig_url,
            "cutout_url": cut_url,
        })

    export_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()
    export_doc = {
        "id": export_id,
        "sender_uid": sender_uid,
        "sender_email": sender.get("email", ""),
        "sender_name": sender.get("name", ""),
        "sender_picture": sender.get("picture", ""),
        "recipient_uid": target_user["uid"],
        "recipient_email": target_user["email"],
        "recipient_email_lower": target_user["email"].strip().lower(),
        "recipient_name": target_user.get("name", ""),
        "message": (message or "").strip(),
        "status": "pending",
        "items_count": len(items_snapshot),
        "categories_summary": categories_summary,
        "items": items_snapshot,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    db = get_db()
    db.collection("wardrobe_exports").document(export_id).set(export_doc)
    return export_doc


def list_incoming_wardrobe_exports(uid: str, email: str) -> list[dict]:
    """
    Lists all pending wardrobe exports sent to the given user (by uid or email).
    """
    db = get_db()
    coll = db.collection("wardrobe_exports")
    results_map = {}

    if uid:
        for doc in coll.where("recipient_uid", "==", uid).stream():
            d = doc.to_dict()
            if d.get("status") == "pending":
                results_map[doc.id] = d

    if email:
        email_lower = email.strip().lower()
        for doc in coll.where("recipient_email_lower", "==", email_lower).stream():
            d = doc.to_dict()
            if d.get("status") == "pending":
                results_map[doc.id] = d

    exports_list = list(results_map.values())
    exports_list.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return exports_list


def accept_wardrobe_export(
    recipient: dict,
    export_id: str,
    selected_item_ids: list[str] | None = None
) -> dict:
    """
    Imports items from a pending wardrobe export into the recipient's wardrobe,
    duplicating GCS image blobs so the recipient has independent copies.
    """
    from app.storage_service import copy_blob

    db = get_db()
    doc_ref = db.collection("wardrobe_exports").document(export_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise ValueError("Exportação de guarda-roupa não encontrada.")

    export_data = snap.to_dict()
    recipient_uid = recipient["uid"]
    recipient_email = (recipient.get("email") or "").strip().lower()

    if export_data.get("recipient_uid") != recipient_uid and export_data.get("recipient_email_lower") != recipient_email:
        raise PermissionError("Esta exportação pertence a outro usuário.")

    if export_data.get("status") != "pending":
        raise ValueError("Esta exportação já foi processada anteriormente.")

    items_to_import = export_data.get("items", [])
    if selected_item_ids is not None:
        allowed = set(selected_item_ids)
        items_to_import = [i for i in items_to_import if i.get("id") in allowed]

    imported_items = []
    added_categories = set()

    for src_item in items_to_import:
        new_id = str(uuid.uuid4())
        cat = src_item.get("categoria", "Outros")
        if cat and cat not in added_categories:
            add_user_category(recipient_uid, cat)
            added_categories.add(cat)

        # Copy GCS image if available so recipient owns an independent copy
        src_orig_path = src_item.get("original_image_path", "")
        new_orig_path = ""
        orig_url = src_item.get("original_image_url") or src_item.get("original_url") or ""
        cut_url = src_item.get("cutout_image_url") or src_item.get("cutout_url") or orig_url

        if src_orig_path:
            ext = ".jpg"
            if "." in src_orig_path.split("/")[-1]:
                ext = "." + src_orig_path.split(".")[-1]
            candidate_dest = f"users/{recipient_uid}/originals/{new_id}{ext}"
            if copy_blob(src_orig_path, candidate_dest):
                new_orig_path = candidate_dest
                orig_url = f"/api/media/{new_orig_path}"
                cut_url = orig_url

        new_item_doc = {
            "id": new_id,
            "uid": recipient_uid,
            "user_email": recipient.get("email", ""),
            "categoria": cat,
            "tipo": src_item.get("tipo", "Peça de Roupa"),
            "cor_predominante": src_item.get("cor_predominante", "Não identificada"),
            "cor_hex": src_item.get("cor_hex", "#94a3b8"),
            "descricao": src_item.get("descricao", ""),
            "estacao": src_item.get("estacao", "Todas"),
            "estilo": src_item.get("estilo", "Casual"),
            "data_aquisicao": src_item.get("data_aquisicao", ""),
            "preco_pago": src_item.get("preco_pago", ""),
            "loja_comprada": src_item.get("loja_comprada", ""),
            "is_generic": bool(src_item.get("is_generic", False)),
            "quantidade": src_item.get("quantidade", 1),
            "nao_repetir": bool(src_item.get("nao_repetir", False)),
            "status_roupa": src_item.get("status_roupa", "Ok"),
            "original_image_path": new_orig_path or src_orig_path,
            "cutout_image_path": new_orig_path or src_item.get("cutout_image_path", ""),
            "original_image_url": orig_url,
            "cutout_image_url": cut_url,
            "original_url": orig_url,
            "cutout_url": cut_url,
            "imported_from_email": export_data.get("sender_email", ""),
        }
        saved = create_item(recipient_uid, new_item_doc)
        imported_items.append(saved)

    now_iso = datetime.utcnow().isoformat()
    doc_ref.update({
        "status": "accepted",
        "accepted_at": now_iso,
        "updated_at": now_iso,
        "imported_count": len(imported_items),
    })

    return {
        "export_id": export_id,
        "imported_count": len(imported_items),
        "sender_email": export_data.get("sender_email", ""),
        "sender_name": export_data.get("sender_name", ""),
    }


def decline_wardrobe_export(recipient: dict, export_id: str) -> dict:
    """
    Marks a pending wardrobe export as declined/dismissed.
    """
    db = get_db()
    doc_ref = db.collection("wardrobe_exports").document(export_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise ValueError("Exportação não encontrada.")

    export_data = snap.to_dict()
    recipient_uid = recipient["uid"]
    recipient_email = (recipient.get("email") or "").strip().lower()

    if export_data.get("recipient_uid") != recipient_uid and export_data.get("recipient_email_lower") != recipient_email:
        raise PermissionError("Esta exportação pertence a outro usuário.")

    now_iso = datetime.utcnow().isoformat()
    doc_ref.update({
        "status": "declined",
        "declined_at": now_iso,
        "updated_at": now_iso,
    })
    return {"export_id": export_id, "status": "declined"}




