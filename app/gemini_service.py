import json
import logging
from google import genai
from google.genai import types
from app.config import PROJECT_ID, LOCATION, GEMINI_MODEL, VALID_CATEGORIES

logger = logging.getLogger(__name__)

_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)
    return _genai_client

def analyze_clothing_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    client = get_genai_client()
    
    prompt = f"""Você é um estilista e especialista de inteligência artificial em moda para o aplicativo "Roupeiro Virtual".
Analise a imagem da peça de roupa fornecida e extraia as informações detalhadas em formato JSON.

As categorias permitidas são estritamente:
{json.dumps(VALID_CATEGORIES, ensure_ascii=False)}

Instruções:
1. categoria: Escolha a categoria mais apropriada dentre as permitidas acima.
2. tipo: Nome específico e descritivo da peça em português (ex: "Camiseta Básica Gola Careca", "Camisa Social Manga Longa", "Calça Jeans Slim", "Vestido Midi Floral", "Tênis Esportivo", "Jaqueta Corta-Vento", "Blazer Alfaiataria", "Bermuda Chino").
3. cor_predominante: Nome da cor dominante da peça em português (ex: "Azul Marinho", "Preto", "Branco", "Verde Militar", "Bordô", "Bege", "Cinza Mescla", "Amarelo Mostarda", etc).
4. cor_hex: O código hexadecimal aproximado da cor predominante (ex: "#1e3a8a", "#000000", "#ffffff").
5. descricao: Descrição concisa, elegante e objetiva da peça, destacando tecido aparente, corte, detalhes como bolsos, estampas ou botões.
6. estacao: Uma opção entre "Verão", "Inverno", "Meia-estação" ou "Todas".
7. estilo: Uma opção entre "Casual", "Formal", "Esportivo", "Elegante", "Básico" ou "Urbano".
8. box_2d: Array com [ymin, xmin, ymax, xmax] normalizados de 0 a 1000 delimitando a peça de roupa principal na imagem (para recorte focado).

Retorne APENAS um objeto JSON válido, sem markdown envolvente.
"""

    # Normalize mime_type if needed
    if mime_type.lower() in ["image/jpg", "jpg"]:
        mime_type = "image/jpeg"

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )
        )
        
        raw_text = response.text.strip()
        # Clean potential markdown fences if present
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        
        data = json.loads(raw_text)
        
        # Validate category
        if data.get("categoria") not in VALID_CATEGORIES:
            # Fallback matching
            cat_found = False
            for c in VALID_CATEGORIES:
                if c.lower() in str(data.get("categoria", "")).lower():
                    data["categoria"] = c
                    cat_found = True
                    break
            if not cat_found:
                data["categoria"] = "Outros"
                
        logger.info(f"Gemini analysis completed: {data.get('tipo')} ({data.get('categoria')}) - {data.get('cor_predominante')}")
        return data

    except Exception as e:
        logger.error(f"Error calling Gemini model {GEMINI_MODEL}: {e}")
        # Return sensible fallback if model call encounters issue
        return {
            "categoria": "Outros",
            "tipo": "Peça de Roupa",
            "cor_predominante": "Indefinida",
            "cor_hex": "#94a3b8",
            "descricao": "Peça adicionada ao roupeiro",
            "estacao": "Todas",
            "estilo": "Casual",
            "box_2d": [0, 0, 1000, 1000]
        }

def plan_trip_and_pack(
    destination: str,
    arrival_date: str,
    arrival_time: str,
    departure_date: str,
    departure_time: str,
    notes: str,
    wardrobe_items: list[dict]
) -> dict:
    """
    Calls Gemini to plan a comprehensive day-by-day and night-by-night trip itinerary,
    predicting weather, planning realistic travel times, and assembling custom outfits
    from the user's wardrobe items for day and night.
    """
    client = get_genai_client()

    # Minify wardrobe items for token efficiency
    compact_wardrobe = [
        {
            "id": item.get("id"),
            "tipo": item.get("tipo"),
            "categoria": item.get("categoria"),
            "cor_predominante": item.get("cor_predominante"),
            "cor_hex": item.get("cor_hex"),
            "estilo": item.get("estilo", "Casual"),
            "estacao": item.get("estacao", "Todas"),
            "descricao": item.get("descricao", ""),
            "is_generic": bool(item.get("is_generic", False)),
            "quantidade": max(1, int(item.get("quantidade") or 1)),
            "nao_repetir": bool(item.get("nao_repetir", False))
        }
        for item in wardrobe_items
    ]

    prompt = f"""Você é um estilista pessoal de alta-costura e um experiente guia de viagens internacional.
O usuário solicitou o recurso 'Faça Minha Mala' no aplicativo 'Roupeiro Virtual'.

=== DADOS DA VIAGEM ===
- Destino: {destination}
- Chegada no destino: {arrival_date} às {arrival_time}
- Partida do destino: {departure_date} às {departure_time}
- Preferências / Observações do usuário: {notes or 'Nenhuma preferência específica informada'}

=== GUARDA-ROUPA DO USUÁRIO (PEÇAS DISPONÍVEIS) ===
{json.dumps(compact_wardrobe, ensure_ascii=False, indent=2)}

=== DIRETRIZES DE PLANEJAMENTO ===
1. ROTEIRO E HORÁRIOS:
   - Planeje todos os dias da viagem ({arrival_date} até {departure_date}).
   - No 1º dia ({arrival_date}), considere o horário de chegada ({arrival_time}): reserve tempo inicial para deslocamento até o hotel e check-in antes de iniciar passeios turísticos.
   - No último dia ({departure_date}), considere o horário de partida ({departure_time}): programe apenas atividades viáveis antes da partida e preveja tempo adequado para ida ao aeroporto/estação.
   - Entre os locais de cada dia, estime tempos realistas de trajeto (ex: "15 min a pé", "20 min de metrô", "10 min de táxi").

2. CLIMA E TEMPERATURA:
   - Para cada dia, informe o clima e temperatura previstos para o DIA e para a NOITE no destino (ex: dia 21°C e ensolarado / noite 13°C e fresco/frio).
   - Use ícones compatíveis com FontAwesome como 'fa-sun', 'fa-cloud-sun', 'fa-cloud-rain', 'fa-snowflake', 'fa-moon', etc.

3. MONTAGEM DE LOOKS COMPLETOS PARA CADA PERÍODO:
   - O look de cada período (diurno e noturno) DEVE ser COMPLETO, contendo obrigatoriamente os seguintes slots:
     a) 'top' (Parte Superior: camisa, camiseta, polo, regata, blusa) E 'bottom' (Parte Inferior: calça, bermuda, saia) OU 'single' (Peça Única: vestido ou macacão).
     b) 'shoes' (Calçado: tênis, sapato, bota, sandália).
     c) 'socks' (Meia: meia invisível, cano curto, cano médio, meia social, meia-calça).
     d) 'underwear' (Peça Íntima: roupa íntima apropriada).
     e) 'layer' (Sobreposição / Agasalho: blusa de frio, malha, cardigã, jaqueta, blazer ou casaco, dependendo da temperatura e se for noite).
     f) 'accessory' (Acessório: óculos escuros se for dia ensolarado, cachecol se for frio/vento, cinto ou bolsa).

4. REGRA DOS ITENS A PREENCHER (PLACEHOLDERS):
   - Para cada slot do look:
     * SE houver uma peça correspondente no guarda-roupa do usuário: use `is_placeholder: false`, `item_id: "<id_da_peça>"`, e use os dados reais da peça.
     * SE NÃO HOUVER a peça necessária no guarda-roupa do usuário (ex: falta meia, peça íntima, calçado específico ou casaco quente): NÃO omita o item! Defina `is_placeholder: true`, `item_id: null`, indique o `tipo` ideal da peça (ex: "Meia Invisível de Algodão"), a `categoria`, a `cor` recomendada, e um `shopping_query` para busca no Google Shopping (ex: "meia invisivel algodao branca masculina").

5. ATIVIDADE NOTURNA:
   - Se houver passeio ou jantar noturno, monte um segundo look noturno completo, reforçando agasalhos e estilo mais elegante.
   - Se não houver atividade noturna planejada no dia, marque 'has_activity': false.

6. REGRA ABSOLUTA DE NÃO REPETIÇÃO (`nao_repetir: true`):
   - Itens que possuem a flag de não repetir (`nao_repetir: true`) NÃO PODEM, em hipótese alguma, ser colocados em mais de um dia ou período!
   - Uma peça normal com `nao_repetir: true` só pode ser usada em UM ÚNICO dia e UM ÚNICO período (diurno OU noturno) de toda a viagem. Jamais coloque a mesma peça em outro dia ou outro período.
   - Para itens genéricos com quantidade definida (ex: "Meia Branca" x5, "Cueca Slip" x5) marcados com `nao_repetir: true`:
     * Cada unidade individual só pode ser usada uma única vez em toda a viagem.
     * Numere obrigatoriamente cada uso de forma sequencial: "Cueca Slip #1", "Cueca Slip #2", "Meia Branca #1", etc.
     * NUNCA ultrapasse a quantidade disponível (`quantidade`) no roupeiro! Se houver 5 unidades, só é permitido usar até o #5.
     * Ao esgotar a quantidade para os períodos subsequentes, NÃO repita as peças anteriores; gere obrigatoriamente um item placeholder a preencher indicando a falta (ex: "Cueca Slip #6 (Faltante no roupeiro)"), com `is_placeholder: true` e `item_id: null`.
   - Sempre que uma peça necessária tiver `nao_repetir: true` e já tiver sido utilizada em período anterior, gere um item a preencher (`is_placeholder: true`, `item_id: null`).

Retorne APENAS um JSON válido seguindo estritamente a seguinte estrutura:
{{
  "destination": "{destination}",
  "arrival": "{arrival_date} {arrival_time}",
  "departure": "{departure_date} {departure_time}",
  "summary": "Resumo acolhedor e inspirador da viagem planejada",
  "total_days": <numero_de_dias>,
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "Título conciso do dia",
      "weather": {{
        "day": {{
          "temp_c": "21°C",
          "condition": "Ensolarado com brisa leve",
          "icon": "fa-sun"
        }},
        "night": {{
          "temp_c": "13°C",
          "condition": "Céu limpo e temperatura em declínio",
          "icon": "fa-moon"
        }}
      }},
      "day_period": {{
        "period_name": "Dia",
        "locations": [
          {{
            "id": "loc_1_1",
            "time": "14:30 - 16:00",
            "name": "Nome do Local / Atividade",
            "description": "Breve descrição da visita",
            "travel_time": "25 min de trajeto",
            "style": "Casual"
          }}
        ],
        "look": {{
          "title": "Look Diurno Completo",
          "style": "Casual",
          "justification": "Explicação do look para o clima e atrações",
          "recommendations": "Dica de estilo ou calçado confortável",
          "item_ids": ["id_da_peca_1", "id_da_peca_2"],
          "items": [
            {{
              "slot": "top",
              "slot_name": "Parte Superior",
              "is_placeholder": false,
              "item_id": "id_da_peca_1",
              "tipo": "Camisa de Linho Branca",
              "categoria": "Camisas & Camisetas",
              "cor": "Branco",
              "por_que_foi_escolhida": "Fresca para o clima diurno",
              "shopping_query": "camisa linho branca casual"
            }},
            {{
              "slot": "bottom",
              "slot_name": "Parte Inferior",
              "is_placeholder": false,
              "item_id": "id_da_peca_2",
              "tipo": "Calça Jeans Confort",
              "categoria": "Calças",
              "cor": "Azul",
              "por_que_foi_escolhida": "Confortável para caminhar",
              "shopping_query": "calca jeans masculina confort"
            }},
            {{
              "slot": "shoes",
              "slot_name": "Calçado",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Tênis Branco Casual",
              "categoria": "Calçados",
              "cor": "Branco",
              "por_que_foi_escolhida": "Item a preencher: tênis essencial para caminhada",
              "shopping_query": "tenis casual branco couro confortavel"
            }},
            {{
              "slot": "socks",
              "slot_name": "Meia",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Meia Invisível Algodão",
              "categoria": "Moda Íntima",
              "cor": "Branco",
              "por_que_foi_escolhida": "Item a preencher: proteção para os pés",
              "shopping_query": "meia sapatilha invisivel algodao"
            }},
            {{
              "slot": "underwear",
              "slot_name": "Peça Íntima",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Peça Íntima Confortável",
              "categoria": "Moda Íntima",
              "cor": "Neutro",
              "por_que_foi_escolhida": "Item a preencher: peça íntima essencial",
              "shopping_query": "cueca boxer modal conforto"
            }},
            {{
              "slot": "layer",
              "slot_name": "Casaco / Malha",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Cardigã ou Jaqueta Leve",
              "categoria": "Casacos & Jaquetas",
              "cor": "Cinza",
              "por_que_foi_escolhida": "Item a preencher: agasalho para ambiente refrigerado ou brisa",
              "shopping_query": "cardiga leve malha casual"
            }},
            {{
              "slot": "accessory",
              "slot_name": "Acessório",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Óculos Escuros Proteção UV",
              "categoria": "Acessórios",
              "cor": "Preto",
              "por_que_foi_escolhida": "Item a preencher: proteção contra sol durante o dia",
              "shopping_query": "oculos de sol protecao uv preto"
            }}
          ]
        }}
      }},
      "night_period": {{
        "has_activity": true,
        "period_name": "Noite",
        "locations": [
          {{
            "id": "loc_1_2",
            "time": "20:00 - 22:30",
            "name": "Nome do Local Noturno",
            "description": "Descrição do jantar ou passeio noturno",
            "travel_time": "15 min de táxi",
            "style": "Elegante"
          }}
        ],
        "look": {{
          "title": "Look Noturno Completo",
          "style": "Elegante",
          "justification": "Explicação considerando a temperatura da noite e o ambiente",
          "recommendations": "Dica de acessório ou sobreposição",
          "item_ids": [],
          "items": [
            {{
              "slot": "top",
              "slot_name": "Parte Superior",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Camisa Social Manga Longa",
              "categoria": "Camisas & Camisetas",
              "cor": "Azul Marinho",
              "por_que_foi_escolhida": "Item a preencher: visual elegante para jantar",
              "shopping_query": "camisa social masculina manga longa azul marinho"
            }},
            {{
              "slot": "bottom",
              "slot_name": "Parte Inferior",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Calça Alfaiataria",
              "categoria": "Calças",
              "cor": "Cinza Chumbo",
              "por_que_foi_escolhida": "Item a preencher: corte alinhado",
              "shopping_query": "calca alfaiataria slim cinza"
            }},
            {{
              "slot": "shoes",
              "slot_name": "Calçado",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Sapato Social ou Mocassim",
              "categoria": "Calçados",
              "cor": "Preto",
              "por_que_foi_escolhida": "Item a preencher: formalidade e estilo",
              "shopping_query": "mocassim masculino couro preto"
            }},
            {{
              "slot": "socks",
              "slot_name": "Meia",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Meia Social Fina",
              "categoria": "Moda Íntima",
              "cor": "Preto",
              "por_que_foi_escolhida": "Item a preencher: acabamento elegante com sapato",
              "shopping_query": "meia social algodao preta"
            }},
            {{
              "slot": "underwear",
              "slot_name": "Peça Íntima",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Peça Íntima Noturna",
              "categoria": "Moda Íntima",
              "cor": "Neutro",
              "por_que_foi_escolhida": "Item a preencher: peça íntima limpa para a noite",
              "shopping_query": "cueca boxer modal"
            }},
            {{
              "slot": "layer",
              "slot_name": "Casaco / Blazer",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Blazer ou Jaqueta Estruturada",
              "categoria": "Casacos & Jaquetas",
              "cor": "Preto ou Marinho",
              "por_que_foi_escolhida": "Item a preencher: proteção contra a queda de temperatura da noite",
              "shopping_query": "blazer masculino slim preto"
            }},
            {{
              "slot": "accessory",
              "slot_name": "Acessório",
              "is_placeholder": true,
              "item_id": null,
              "tipo": "Cachecol Fino ou Relógio",
              "categoria": "Acessórios",
              "cor": "Grafite",
              "por_que_foi_escolhida": "Item a preencher: toque refinado para a noite",
              "shopping_query": "cachecol masculino inverno toque macio"
            }}
          ]
        }}
      }}
    }}
  ],
  "packing_tips": "Dicas essenciais de embalagem e estilo para o destino",
  "suggested_essentials": ["Adaptador universal", "Protetor solar", "Guarda-chuva dobrável"]
}}
"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.35,
            )
        )

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        data = json.loads(raw_text)

        # Ensure all looks in all days are normalized with complete slots
        for day in data.get("days", []):
            if isinstance(day.get("day_period"), dict) and "look" in day["day_period"]:
                day["day_period"]["look"] = normalize_look(day["day_period"]["look"], wardrobe_items)
            if isinstance(day.get("night_period"), dict) and "look" in day["night_period"]:
                day["night_period"]["look"] = normalize_look(day["night_period"]["look"], wardrobe_items)

        # Enforce generic items with quantities, numbering (#1, #2...) and no-repeat rules
        data = assign_and_number_generic_items(data, wardrobe_items)

        logger.info(f"Trip successfully planned with Gemini for {destination} ({len(data.get('days', []))} days)")
        return data

    except Exception as e:
        logger.error(f"Error planning trip with Gemini model {GEMINI_MODEL}: {e}")
        raise RuntimeError(f"Falha ao gerar roteiro e mala com Gemini: {e}")

def regenerate_look_with_prompt(
    destination: str,
    period_name: str,
    weather: dict,
    locations: list[dict],
    current_look: dict,
    user_prompt: str,
    wardrobe_items: list[dict]
) -> dict:
    """
    Regenerates a specific look for a trip period based on a user's typed or spoken prompt,
    consulting the user's wardrobe to satisfy the request.
    """
    client = get_genai_client()

    compact_wardrobe = [
        {
            "id": item.get("id"),
            "tipo": item.get("tipo"),
            "categoria": item.get("categoria"),
            "cor_predominante": item.get("cor_predominante"),
            "cor_hex": item.get("cor_hex"),
            "estilo": item.get("estilo", "Casual"),
            "estacao": item.get("estacao", "Todas"),
            "descricao": item.get("descricao", ""),
            "is_generic": bool(item.get("is_generic", False)),
            "quantidade": max(1, int(item.get("quantidade") or 1)),
            "nao_repetir": bool(item.get("nao_repetir", False))
        }
        for item in wardrobe_items
    ]

    prompt = f"""Você é um estilista pessoal de moda.
O usuário está ajustando o visual para um momento específico de sua viagem a {destination}.

=== CONTEXTO DO MOMENTO ===
- Período: {period_name}
- Clima e Temperatura: {json.dumps(weather, ensure_ascii=False)}
- Locais e Atividades programadas: {json.dumps(locations, ensure_ascii=False)}
- Look atual sugerido: {json.dumps(current_look, ensure_ascii=False)}

=== PEDIDO DE AJUSTE DO USUÁRIO (TEXTO OU VOZ TRANSCRIÇÃO) ===
\"{user_prompt}\"

=== GUARDA-ROUPA DISPONÍVEL DO USUÁRIO ===
{json.dumps(compact_wardrobe, ensure_ascii=False, indent=2)}

=== INSTRUÇÃO ===
Monte uma nova combinação de look que atenda perfeitamente ao pedido do usuário.
O visual DEVE ESTAR COMPLETO para o período ({period_name}):
- Calçado (tênis, sapato, bota, sandália)
- Parte de cima e parte de baixo (OU peça única se for vestido/macacão)
- Meia
- Peça íntima
- Sobreposição / Camada Extra (blusa, malha e/ou casaco dependendo da temperatura)
- Acessório (óculos de sol para dia, cachecol para frio, etc.)

REGRA DE PEÇAS A PREENCHER (PLACEHOLDERS):
- Para cada slot: se encontrar uma peça adequada no guarda-roupa, use `is_placeholder: false` e `item_id: "<id_da_peça>"`.
- Se não houver a peça no guarda-roupa para o slot, NÃO omita! Defina `is_placeholder: true`, `item_id: null`, indique o `tipo`, `categoria`, `cor` sugerida, e `shopping_query` para compra.

Retorne APENAS um JSON válido no formato:
{{
  "title": "Nome renovado e atraente do look",
  "style": "Estilo correspondente (ex: Casual, Esportivo, Formal, Elegante, etc)",
  "justification": "Explicação detalhada e estilosa de como o novo look atende ao pedido do usuário, ao clima e aos locais",
  "recommendations": "Dica prática de composição, calçado ou acessório",
  "item_ids": ["id_da_peca_escolhida_1"],
  "items": [
    {{
      "slot": "top",
      "slot_name": "Parte Superior",
      "is_placeholder": false,
      "item_id": "id_da_peca_escolhida_1",
      "tipo": "Camisa Polo Branca",
      "categoria": "Camisas & Camisetas",
      "cor": "Branco",
      "por_que_foi_escolhida": "Atende ao pedido do usuário de forma confortável",
      "shopping_query": "camisa polo branca masculina"
    }},
    {{
      "slot": "bottom",
      "slot_name": "Parte Inferior",
      "is_placeholder": true,
      "item_id": null,
      "tipo": "Calça Chino Bege",
      "categoria": "Calças",
      "cor": "Bege",
      "por_que_foi_escolhida": "Item a preencher: combina perfeitamente com a parte superior",
      "shopping_query": "calca chino bege masculina"
    }},
    {{
      "slot": "shoes",
      "slot_name": "Calçado",
      "is_placeholder": true,
      "item_id": null,
      "tipo": "Tênis Casual",
      "categoria": "Calçados",
      "cor": "Branco",
      "por_que_foi_escolhida": "Item a preencher: conforto no deslocamento",
      "shopping_query": "tenis casual branco couro"
    }},
    {{
      "slot": "socks",
      "slot_name": "Meia",
      "is_placeholder": true,
      "item_id": null,
      "tipo": "Meia Invisível Algodão",
      "categoria": "Moda Íntima",
      "cor": "Branco",
      "por_que_foi_escolhida": "Item a preencher: proteção para os pés",
      "shopping_query": "meia invisivel algodao"
    }},
    {{
      "slot": "underwear",
      "slot_name": "Peça Íntima",
      "is_placeholder": true,
      "item_id": null,
      "tipo": "Peça Íntima",
      "categoria": "Moda Íntima",
      "cor": "Neutro",
      "por_que_foi_escolhida": "Item a preencher: peça essencial",
      "shopping_query": "roupa intima confortavel"
    }},
    {{
      "slot": "layer",
      "slot_name": "Casaco / Malha",
      "is_placeholder": true,
      "item_id": null,
      "tipo": "Jaqueta ou Casaco Leve",
      "categoria": "Casacos & Jaquetas",
      "cor": "Marinho",
      "por_que_foi_escolhida": "Item a preencher: proteção contra variação térmica",
      "shopping_query": "jaqueta corta vento marinho"
    }},
    {{
      "slot": "accessory",
      "slot_name": "Acessório",
      "is_placeholder": true,
      "item_id": null,
      "tipo": "Óculos Escuros ou Cachecol",
      "categoria": "Acessórios",
      "cor": "Preto",
      "por_que_foi_escolhida": "Item a preencher: acessório ideal para a ocasião",
      "shopping_query": "oculos de sol masculino uv"
    }}
  ]
}}
"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            )
        )

        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        data = json.loads(raw_text)
        normalized = normalize_look(data, wardrobe_items)
        logger.info(f"Look regenerated with Gemini: {normalized.get('title')}")
        return normalized

    except Exception as e:
        logger.error(f"Error regenerating look with Gemini model {GEMINI_MODEL}: {e}")
        raise RuntimeError(f"Falha ao regenerar look com Gemini: {e}")


def assign_and_number_generic_items(data: dict, wardrobe_items: list[dict]) -> dict:
    """
    Enforces that generic items with quantity are numbered sequentially (e.g. 'Cueca Slip #1', 'Cueca Slip #2')
    and not repeated beyond their available quantity if nao_repetir is set.
    Also ensures non-generic items marked with nao_repetir: true are not used on multiple days.
    """
    if not isinstance(data, dict) or not isinstance(data.get("days"), list):
        return data

    wardrobe_map = {item.get("id"): item for item in wardrobe_items if item.get("id")}
    generic_items = [item for item in wardrobe_items if item.get("is_generic")]

    # Counters for generic items usage: item_id -> int
    generic_usage_counter = {item.get("id"): 0 for item in generic_items}

    # Tracking non-generic single-use items: item_id -> first used period identifier
    non_generic_used_periods = {}

    for day in data.get("days", []):
        day_num = day.get("day_number", 1)

        for period_key in ["day_period", "night_period"]:
            period = day.get(period_key)
            if not isinstance(period, dict) or not isinstance(period.get("look"), dict):
                continue

            look = period["look"]
            items = look.get("items", [])
            if not isinstance(items, list):
                continue

            for it in items:
                if not isinstance(it, dict):
                    continue

                slot = it.get("slot")
                item_id = it.get("item_id")
                w_piece = wardrobe_map.get(item_id) if item_id else None

                # 1. Check if this item is a generic wardrobe piece
                if w_piece and w_piece.get("is_generic"):
                    g_id = w_piece["id"]
                    generic_usage_counter[g_id] = generic_usage_counter.get(g_id, 0) + 1
                    usage_num = generic_usage_counter[g_id]
                    max_qty = max(1, int(w_piece.get("quantidade") or 1))
                    base_tipo = w_piece.get("tipo", "Item").split("#")[0].strip()

                    if usage_num <= max_qty:
                        it["tipo"] = f"{base_tipo} #{usage_num}"
                        it["unit_number"] = usage_num
                        it["is_placeholder"] = False
                        it["item_id"] = g_id
                    else:
                        if w_piece.get("nao_repetir", False):
                            # Exceeded quantity and marked not to repeat -> mark as placeholder
                            it["is_placeholder"] = True
                            it["item_id"] = None
                            it["tipo"] = f"{base_tipo} #{usage_num} (Faltante no roupeiro)"
                            it["shopping_query"] = f"{base_tipo} {w_piece.get('cor_predominante', '')}".strip()
                        else:
                            it["tipo"] = f"{base_tipo} #{usage_num} (Reutilizado)"
                            it["unit_number"] = usage_num

                # 2. If it is a placeholder in underwear/socks and a generic item is available
                elif it.get("is_placeholder") and slot in ("underwear", "socks"):
                    matched_generic = None
                    for g in generic_items:
                        g_tipo_l = g.get("tipo", "").lower()
                        g_cat_l = g.get("categoria", "").lower()
                        if slot == "underwear" and any(k in g_tipo_l or k in g_cat_l for k in ["cueca", "calcinha", "intima", "íntima", "boxer", "slip", "sutiã"]):
                            matched_generic = g
                            break
                        elif slot == "socks" and "meia" in g_tipo_l:
                            matched_generic = g
                            break

                    if matched_generic:
                        g_id = matched_generic["id"]
                        max_qty = max(1, int(matched_generic.get("quantidade") or 1))
                        curr_used = generic_usage_counter.get(g_id, 0)
                        if curr_used < max_qty:
                            generic_usage_counter[g_id] = curr_used + 1
                            usage_num = generic_usage_counter[g_id]
                            base_tipo = matched_generic.get("tipo", "Item").split("#")[0].strip()
                            it["tipo"] = f"{base_tipo} #{usage_num}"
                            it["unit_number"] = usage_num
                            it["is_placeholder"] = False
                            it["item_id"] = g_id
                            it["categoria"] = matched_generic.get("categoria", it.get("categoria"))
                            it["cor"] = matched_generic.get("cor_predominante", it.get("cor"))
                            it["por_que_foi_escolhida"] = f"Peça genérica #{usage_num} do roupeiro ({usage_num} de {max_qty})"

                # 3. Check non-generic items with nao_repetir (cannot be used in more than 1 day or period)
                elif w_piece and not w_piece.get("is_generic") and w_piece.get("nao_repetir"):
                    period_id = f"Dia {day_num} ({period_key})"
                    if item_id in non_generic_used_periods:
                        clean_name = w_piece.get("tipo", "Peça")
                        it["is_placeholder"] = True
                        it["item_id"] = None
                        it["tipo"] = f"{clean_name} (Indisponível - uso único/não repetir)"
                        it["shopping_query"] = f"{clean_name} {w_piece.get('cor_predominante', '')}".strip()
                    else:
                        non_generic_used_periods[item_id] = period_id

            look["item_ids"] = [it["item_id"] for it in items if it.get("item_id")]

    return data


def normalize_look(look: dict, wardrobe_items: list[dict]) -> dict:
    """
    Ensures that a look dictionary contains complete slots (top/bottom or single,
    shoes, socks, underwear, layer, accessory) with proper placeholder flags and item_ids.
    """
    if not isinstance(look, dict):
        look = {}

    look.setdefault("title", "Look Personalizado")
    look.setdefault("style", "Casual")
    look.setdefault("justification", "Combinação planejada para o período.")
    look.setdefault("recommendations", "")

    items = look.get("items")
    if not isinstance(items, list):
        items = []

    wardrobe_map = {item.get("id"): item for item in wardrobe_items if item.get("id")}

    # Define standard slot order
    required_slots = [
        {"slot": "top", "name": "Parte Superior", "tipo": "Camisa / Camiseta", "cat": "Camisas & Camisetas"},
        {"slot": "bottom", "name": "Parte Inferior", "tipo": "Calça / Bermuda / Saia", "cat": "Calças"},
        {"slot": "shoes", "name": "Calçado", "tipo": "Tênis / Calçado Confortável", "cat": "Calçados"},
        {"slot": "socks", "name": "Meia", "tipo": "Meia de Algodão", "cat": "Moda Íntima"},
        {"slot": "underwear", "name": "Peça Íntima", "tipo": "Peça Íntima", "cat": "Moda Íntima"},
        {"slot": "layer", "name": "Casaco / Malha", "tipo": "Blusa de Frio / Casaco", "cat": "Casacos & Jaquetas"},
        {"slot": "accessory", "name": "Acessório", "tipo": "Óculos de Sol / Acessório", "cat": "Acessórios"},
    ]

    has_single = any(it.get("slot") == "single" for it in items)

    # Normalize existing items
    normalized_items = []
    seen_slots = set()
    for it in items:
        if not isinstance(it, dict):
            continue
        slot = it.get("slot", "other")
        is_placeholder = it.get("is_placeholder", False)
        item_id = it.get("item_id")

        if item_id and item_id in wardrobe_map:
            w_piece = wardrobe_map[item_id]
            it["tipo"] = w_piece.get("tipo", it.get("tipo", "Peça"))
            it["categoria"] = w_piece.get("categoria", it.get("categoria", "Outros"))
            it["cor"] = w_piece.get("cor_predominante", it.get("cor", ""))
            it["is_placeholder"] = False
            it["original_url"] = w_piece.get("original_url")
            it["cutout_url"] = w_piece.get("cutout_url")
        elif not is_placeholder and item_id:
            # item ID not found in wardrobe
            it["is_placeholder"] = True
            it["item_id"] = None
        elif is_placeholder or not item_id:
            it["is_placeholder"] = True
            it["item_id"] = None

        seen_slots.add(slot)
        normalized_items.append(it)

    # Fill in any missing required slot as a placeholder
    for req in required_slots:
        slot = req["slot"]
        if slot in ("top", "bottom") and has_single:
            continue
        if slot not in seen_slots:
            normalized_items.append({
                "slot": slot,
                "slot_name": req["name"],
                "is_placeholder": True,
                "item_id": None,
                "tipo": req["tipo"],
                "categoria": req["cat"],
                "cor": "Neutro",
                "por_que_foi_escolhida": f"Item a preencher: {req['name']} essencial para o look completo.",
                "shopping_query": f"{req['tipo'].lower()} confortavel"
            })

    look["items"] = normalized_items
    look["item_ids"] = [it["item_id"] for it in normalized_items if it.get("item_id")]
    return look

