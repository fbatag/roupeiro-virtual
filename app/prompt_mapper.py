"""
Mecanismo de Mapeamento de Prompts para o Google Shopping (Prompt Mapping Engine).
Traduz e mapeia prompts em linguagem natural (Português do Brasil ou outros idiomas)
para parâmetros estruturados do Google Shopping:
- Termos de busca otimizados (localizados e limpos)
- Código do país (gl: padrão 'br')
- Código do idioma (hl: padrão 'pt-BR')
- Categoria da Taxonomia de Produtos do Google (Google Product Taxonomy)
- Restrições de preço (preço mínimo, preço máximo, moeda BRL / R$)
- Lojas / Varejistas alvo identificados no prompt
"""

import json
import os
import re
import urllib.parse
from typing import Any, Dict, List, Optional

# Mapeamento de Países Suportados (com Brasil como padrão principal)
COUNTRY_MAP = {
    "brazil": {"gl": "br", "hl": "pt-BR", "currency": "BRL", "currency_sym": "R$", "domain": "google.com.br", "name": "Brasil"},
    "brasil": {"gl": "br", "hl": "pt-BR", "currency": "BRL", "currency_sym": "R$", "domain": "google.com.br", "name": "Brasil"},
    "br": {"gl": "br", "hl": "pt-BR", "currency": "BRL", "currency_sym": "R$", "domain": "google.com.br", "name": "Brasil"},
    "us": {"gl": "us", "hl": "en", "currency": "USD", "currency_sym": "$", "domain": "google.com", "name": "Estados Unidos"},
    "usa": {"gl": "us", "hl": "en", "currency": "USD", "currency_sym": "$", "domain": "google.com", "name": "Estados Unidos"},
    "eua": {"gl": "us", "hl": "en", "currency": "USD", "currency_sym": "$", "domain": "google.com", "name": "Estados Unidos"},
    "estados unidos": {"gl": "us", "hl": "en", "currency": "USD", "currency_sym": "$", "domain": "google.com", "name": "Estados Unidos"},
    "uk": {"gl": "uk", "hl": "en-GB", "currency": "GBP", "currency_sym": "£", "domain": "google.co.uk", "name": "Reino Unido"},
    "reino unido": {"gl": "uk", "hl": "en-GB", "currency": "GBP", "currency_sym": "£", "domain": "google.co.uk", "name": "Reino Unido"},
    "inglaterra": {"gl": "uk", "hl": "en-GB", "currency": "GBP", "currency_sym": "£", "domain": "google.co.uk", "name": "Reino Unido"},
    "germany": {"gl": "de", "hl": "de", "currency": "EUR", "currency_sym": "€", "domain": "google.de", "name": "Alemanha"},
    "alemanha": {"gl": "de", "hl": "de", "currency": "EUR", "currency_sym": "€", "domain": "google.de", "name": "Alemanha"},
    "france": {"gl": "fr", "hl": "fr", "currency": "EUR", "currency_sym": "€", "domain": "google.fr", "name": "França"},
    "frança": {"gl": "fr", "hl": "fr", "currency": "EUR", "currency_sym": "€", "domain": "google.fr", "name": "França"},
    "spain": {"gl": "es", "hl": "es", "currency": "EUR", "currency_sym": "€", "domain": "google.es", "name": "Espanha"},
    "espanha": {"gl": "es", "hl": "es", "currency": "EUR", "currency_sym": "€", "domain": "google.es", "name": "Espanha"},
    "italy": {"gl": "it", "hl": "it", "currency": "EUR", "currency_sym": "€", "domain": "google.it", "name": "Itália"},
    "itália": {"gl": "it", "hl": "it", "currency": "EUR", "currency_sym": "€", "domain": "google.it", "name": "Itália"},
    "argentina": {"gl": "ar", "hl": "es-419", "currency": "ARS", "currency_sym": "AR$", "domain": "google.com.ar", "name": "Argentina"},
}

# Principais Varejistas Brasileiros e Internacionais
STORE_CATALOG = {
    "br": [
        "Lojas Renner", "Renner", "C&A", "Riachuelo", "Zara", "Dafiti", 
        "Amaro", "Mercado Livre", "Amazon Brasil", "Netshoes", "Centauro",
        "Pernambucanas", "Marisa", "Hering", "Shein", "Farm", "Animale",
        "Reserva", "Youcom", "Arezzo", "Schutz", "Anacapri", "Posthaus"
    ],
    "us": [
        "Target", "Macy's", "Nordstrom", "Amazon", "Walmart", "Gap", 
        "Old Navy", "Abercrombie", "Nike", "Adidas", "Bloomingdale's", "Zara"
    ]
}

# Categorias da Taxonomia de Produtos do Google (com foco em Vestuário e Acessórios)
CATEGORY_MAP = [
    {
        "keywords": [
            "camisa", "camisas", "camiseta", "camisetas", "polo", "polos",
            "blusa", "blusas", "cropped", "regata", "regatas", "t-shirt", "tshirt",
            "shirt", "shirts", "top", "tops", "sueter", "suéter", "cardiga", "cardigã"
        ],
        "category": "Vestuário e acessórios > Roupas > Camisas e blusas",
        "taxonomy_id": 212,
        "pt_canonical": "camisas",
        "en_canonical": "shirts"
    },
    {
        "keywords": [
            "vestido", "vestidos", "vestido de festa", "vestido longo", "vestido midi",
            "vestido curto", "dress", "dresses", "macacao", "macacão", "macaquinho"
        ],
        "category": "Vestuário e acessórios > Roupas > Vestidos",
        "taxonomy_id": 2271,
        "pt_canonical": "vestidos",
        "en_canonical": "dresses"
    },
    {
        "keywords": [
            "calça", "calças", "jeans", "calça jeans", "pantalo", "pantalona",
            "alfaiataria", "legging", "leggings", "pants", "trousers"
        ],
        "category": "Vestuário e acessórios > Roupas > Calças",
        "taxonomy_id": 204,
        "pt_canonical": "calças",
        "en_canonical": "pants"
    },
    {
        "keywords": [
            "bermuda", "bermudas", "short", "shorts", "shorts jeans"
        ],
        "category": "Vestuário e acessórios > Roupas > Shorts",
        "taxonomy_id": 207,
        "pt_canonical": "bermudas e shorts",
        "en_canonical": "shorts"
    },
    {
        "keywords": [
            "saia", "saias", "saia midi", "saia longa", "saia jeans", "skirt", "skirts"
        ],
        "category": "Vestuário e acessórios > Roupas > Saias",
        "taxonomy_id": 1581,
        "pt_canonical": "saias",
        "en_canonical": "skirts"
    },
    {
        "keywords": [
            "tênis", "tenis", "sapato", "sapatos", "sandália", "sandalia",
            "sandálias", "sandalias", "rasteirinha", "rasteirinhas", "bota", "botas",
            "coturno", "chinelo", "chinelos", "scarpin", "sapatilha", "sapatilhas",
            "shoe", "shoes", "sneaker", "sneakers", "boots", "sandals"
        ],
        "category": "Vestuário e acessórios > Calçados",
        "taxonomy_id": 187,
        "pt_canonical": "calçados e tênis",
        "en_canonical": "shoes"
    },
    {
        "keywords": [
            "jaqueta", "jaquetas", "casaco", "casacos", "blazer", "blazers",
            "sobretudo", "corta-vento", "corta vento", "moletom", "moletons",
            "colete", "coletes", "jacket", "jackets", "coat", "coats", "outerwear"
        ],
        "category": "Vestuário e acessórios > Roupas > Casacos e jaquetas",
        "taxonomy_id": 559,
        "pt_canonical": "jaquetas e casacos",
        "en_canonical": "jackets"
    },
    {
        "keywords": [
            "bolsa", "bolsas", "mochila", "mochilas", "carteira", "carteiras",
            "mala", "malas", "pochete", "bag", "bags", "handbag", "handbags", "backpack"
        ],
        "category": "Vestuário e acessórios > Bolsas, carteiras e estojos",
        "taxonomy_id": 3032,
        "pt_canonical": "bolsas e mochilas",
        "en_canonical": "handbags"
    },
    {
        "keywords": [
            "acessório", "acessórios", "acessorio", "acessorios", "cinto", "cintos",
            "óculos", "oculos", "óculos de sol", "relogio", "relógio", "relógios",
            "chapéu", "chapeu", "boné", "bone", "lenço", "echarpe", "gravata"
        ],
        "category": "Vestuário e acessórios > Acessórios de vestuário",
        "taxonomy_id": 167,
        "pt_canonical": "acessórios",
        "en_canonical": "accessories"
    }
]

DEFAULT_CATEGORY = {
    "category": "Vestuário e acessórios (Apparel & Accessories)",
    "taxonomy_id": 166
}


class PromptMapper:
    """Mapeia prompts em linguagem natural para parâmetros de busca do Google Shopping."""

    def __init__(self, gemini_api_key: Optional[str] = None):
        self.gemini_api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY")

    def map_prompt(self, user_prompt: str, gender: Optional[str] = None) -> Dict[str, Any]:
        """
        Ponto principal de entrada para mapear o prompt do usuário.
        Prioriza detecção em Português do Brasil com parâmetros brasileiros como padrão.
        """
        clean_prompt = user_prompt.strip()
        if not clean_prompt:
            clean_prompt = "camisas em lojas no Brasil"

        # Se houver chave do Gemini configurada, tenta mapeamento via LLM
        if self.gemini_api_key:
            try:
                llm_result = self._map_with_gemini(clean_prompt)
                if llm_result:
                    if gender:
                        llm_result["gender"] = gender
                    return llm_result
            except Exception as e:
                print(f"[PromptMapper] LLM falhou: {e}, utilizando motor nativo em português.")

        # Motor inteligente de regras para Português / Inglês
        return self._map_with_rules(clean_prompt, gender=gender)

    def _map_with_rules(self, prompt: str, gender: Optional[str] = None) -> Dict[str, Any]:
        lower_prompt = prompt.lower()

        # Detecção de Gênero (se não fornecido externamente)
        detected_gender = None
        if gender:
            g_low = gender.lower()
            if "masc" in g_low or "homem" in g_low:
                detected_gender = "masculino"
            elif "fem" in g_low or "mulher" in g_low:
                detected_gender = "feminino"

        if not detected_gender:
            if re.search(r"\b(masculino|masculina|homem|homens|menino|meninos|para homem|moda masculina)\b", lower_prompt):
                detected_gender = "masculino"
            elif re.search(r"\b(feminino|feminina|mulher|mulheres|menina|meninas|para mulher|moda feminina)\b", lower_prompt):
                detected_gender = "feminino"

        # 1. Detecção de País (Padrão para Brasil)
        detected_country = "br"
        country_info = COUNTRY_MAP["brazil"]

        # Verifica se o usuário especificou explicitamente outro país
        explicit_country_found = False
        for country_key, info in COUNTRY_MAP.items():
            if country_key in ["brasil", "brazil", "br"]:
                continue
            pattern = r"\b" + re.escape(country_key) + r"\b"
            if re.search(pattern, lower_prompt):
                detected_country = info["gl"]
                country_info = info
                explicit_country_found = True
                break

        # 2. Detecção de Categoria
        detected_cat = DEFAULT_CATEGORY["category"]
        detected_cat_id = DEFAULT_CATEGORY["taxonomy_id"]
        canonical_pt = None
        canonical_en = None

        for cat_entry in CATEGORY_MAP:
            for kw in cat_entry["keywords"]:
                pattern = r"\b" + re.escape(kw) + r"\b"
                if re.search(pattern, lower_prompt):
                    detected_cat = cat_entry["category"]
                    detected_cat_id = cat_entry["taxonomy_id"]
                    canonical_pt = cat_entry.get("pt_canonical")
                    canonical_en = cat_entry.get("en_canonical")
                    break
            if canonical_pt:
                break

        # 3. Detecção de Varejistas / Lojas
        identified_stores = []
        available_stores = STORE_CATALOG.get(detected_country, STORE_CATALOG["br"])
        for store in available_stores:
            pattern = r"\b" + re.escape(store.lower()) + r"\b"
            if re.search(pattern, lower_prompt):
                identified_stores.append(store)

        # 4. Detecção de Faixa de Preço (ex: "até R$ 150", "menos de 200 reais", "máximo 100", "under $50")
        min_price = None
        max_price = None

        # Padrões de preço máximo em Português e Inglês
        max_price_match = re.search(
            r"(?:até|ate|menos de|no máximo|no maximo|maximo|máximo|abaixo de|under|below|less than|max)\s*(?:r\$|\$|€|£)?\s*(\d+(?:[.,]\d+)?)(?:\s*reais|\s*dolares|\s*dólares)?",
            lower_prompt
        )
        if max_price_match:
            try:
                max_price = float(max_price_match.group(1).replace(",", "."))
            except ValueError:
                pass

        # Padrões de preço mínimo em Português e Inglês
        min_price_match = re.search(
            r"(?:a partir de|mais de|acima de|no mínimo|no minimo|minimo|mínimo|above|more than|min)\s*(?:r\$|\$|€|£)?\s*(\d+(?:[.,]\d+)?)(?:\s*reais|\s*dolares|\s*dólares)?",
            lower_prompt
        )
        if min_price_match:
            try:
                min_price = float(min_price_match.group(1).replace(",", "."))
            except ValueError:
                pass

        # 5. Limpeza e Construção da Query Otimizada para o Google Shopping
        cleaned_query = lower_prompt
        # Substitui barras e pontuações por espaço
        cleaned_query = re.sub(r"[/,;:()\-+]", " ", cleaned_query)

        # Remove preposições, comandos e ruído conversacional
        remove_phrases = [
            # Comandos em Português
            r"em lojas no brasil", r"em lojas do brasil", r"em lojas de são paulo", r"em lojas de sp",
            r"em lojas no \w+", r"em lojas de \w+", r"nas lojas", r"em lojas", r"no brasil", r"do brasil",
            r"procure por", r"procurar", r"busque por", r"buscar", r"encontrar", r"onde comprar",
            r"quero comprar", r"quero", r"gostaria de", r"mostrar", r"mostre", r"pesquisar",
            r"em promoção", r"com desconto", r"barato", r"barata", r"baratos", r"baratas",
            r"na renner", r"na c&a", r"na riachuelo", r"na zara", r"no mercado livre", r"na dafiti",
            r"na hering", r"na reserva", r"na farm", r"no shop", r"no shopping",
            r"\bou\b", r"\be\b",
            r"até\s*(?:r\$|\$)?\s*\d+(?:[.,]\d+)?(?:\s*reais)?",
            r"menos de\s*(?:r\$|\$)?\s*\d+(?:[.,]\d+)?(?:\s*reais)?",
            # Comandos em Inglês
            r"in stores in brazil", r"in stores in \w+", r"in store in \w+", r"stores in \w+", r"in \w+",
            r"find me", r"search for", r"i want", r"looking for", r"show me",
            r"under\s*(?:\$|r\$)?\s*\d+", r"below\s*(?:\$|r\$)?\s*\d+"
        ]
        for rp in remove_phrases:
            cleaned_query = re.sub(rp, " ", cleaned_query)

        # Se identificou lojas no prompt, remove o nome da loja da query textual para não poluir
        if identified_stores:
            for store in identified_stores:
                cleaned_query = re.sub(r"\b" + re.escape(store.lower()) + r"\b", " ", cleaned_query)

        cleaned_query = re.sub(r"\s+", " ", cleaned_query).strip()

        # Se for no Brasil e o usuário digitou palavras em inglês, traduz para termos de e-commerce brasileiros
        if detected_country == "br":
            translations = {
                "shirts": "camisas",
                "shirt": "camisa",
                "t-shirt": "camisetas",
                "t-shirts": "camisetas",
                "shoes": "tênis",
                "sneakers": "tênis",
                "pants": "calças",
                "dress": "vestidos",
                "dresses": "vestidos",
                "jacket": "jaquetas",
                "jackets": "jaquetas",
                "hoodie": "moletom",
                "bag": "bolsas",
                "bags": "bolsas"
            }
            if cleaned_query in translations:
                search_term = translations[cleaned_query]
            else:
                search_term = cleaned_query or (canonical_pt or "roupas e calçados")
        else:
            search_term = cleaned_query or (canonical_en or "clothing and accessories")

        # Se gênero foi detectado e não está explícito na query de busca, adiciona para refinar a busca
        if detected_gender == "masculino" and not re.search(r"\b(masculin\w*|homem|homens)\b", search_term):
            search_term = f"{search_term} masculino"
        elif detected_gender == "feminino" and not re.search(r"\b(feminin\w*|mulher|mulheres)\b", search_term):
            search_term = f"{search_term} feminino"

        # Monta a URL de busca direta no Google Shopping com o parâmetro oficial udm=28
        params = {
            "q": search_term,
            "gl": country_info["gl"],
            "hl": country_info["hl"],
            "udm": "28"
        }
        if max_price:
            params["tbs"] = f"mr:1,price:1,ppr_max:{int(max_price)}"

        encoded_params = urllib.parse.urlencode(params)
        google_shopping_url = f"https://www.{country_info['domain']}/search?{encoded_params}"

        return {
            "original_prompt": prompt,
            "search_query": search_term,
            "gender": detected_gender,
            "country": country_info["name"],
            "country_code": country_info["gl"],
            "language_code": country_info["hl"],
            "domain": country_info["domain"],
            "currency": country_info["currency"],
            "currency_symbol": country_info["currency_sym"],
            "category": detected_cat,
            "taxonomy_id": detected_cat_id,
            "target_stores": identified_stores if identified_stores else available_stores[:5],
            "price_filter": {
                "min": min_price,
                "max": max_price,
                "currency": country_info["currency"],
                "currency_symbol": country_info["currency_sym"]
            },
            "google_shopping_url": google_shopping_url,
            "direct_url": google_shopping_url,
            "mapping_engine": "motor_regras_pt_br"
        }

    def _map_with_gemini(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Mapeamento avançado com Google Gemini."""
        import urllib.request
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"

        system_instruction = """
        Você é um especialista no mecanismo de busca de produtos do Google Shopping (Google Shopping Query Mapper).
        Analise o prompt em linguagem natural do usuário (em português ou inglês) e retorne estritamente um JSON:
        {
          "search_query": "termos mais relevantes em português brasileiro (ex: 'camisas linho masculinas')",
          "country": "Brasil ou outro país identificado",
          "country_code": "br ou código de 2 letras",
          "language_code": "pt-BR",
          "currency": "BRL",
          "currency_symbol": "R$",
          "category": "Nome da categoria na Taxonomia do Google (ex: 'Vestuário e acessórios > Roupas > Camisas')",
          "taxonomy_id": 212,
          "target_stores": ["Lojas mencionadas ou recomendadas no Brasil"],
          "min_price": null ou número,
          "max_price": null ou número
        }
        Retorne somente JSON válido, sem blocos de código markdown.
        """

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"Prompt do usuário: '{prompt}'\nMapeie para o Google Shopping."}]}
            ],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {"responseMimeType": "application/json"}
        }

        req = urllib.request.Request(
            api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=8) as response:
            result_data = json.loads(response.read().decode("utf-8"))
            candidate_text = result_data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(candidate_text)

            gl = parsed.get("country_code", "br").lower()
            country_info = COUNTRY_MAP.get(gl, COUNTRY_MAP["brazil"])

            params = {
                "q": parsed.get("search_query", prompt),
                "gl": country_info["gl"],
                "hl": country_info["hl"],
                "udm": "28"
            }
            if parsed.get("max_price"):
                params["tbs"] = f"mr:1,price:1,ppr_max:{int(parsed['max_price'])}"

            encoded_params = urllib.parse.urlencode(params)
            google_shopping_url = f"https://www.{country_info['domain']}/search?{encoded_params}"

            parsed["original_prompt"] = prompt
            parsed["domain"] = country_info["domain"]
            parsed["google_shopping_url"] = google_shopping_url
            parsed["mapping_engine"] = "gemini_llm_pt_br"
            return parsed
