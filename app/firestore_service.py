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
    if not doc.exists:
        return False
    doc_ref.delete()
    return True

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



