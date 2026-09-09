# Roupeiro Virtual 👔✨

Uma aplicação inteligente para digitalização, catalogação e gerenciamento de guarda-roupa com Inteligência Artificial, desenvolvida para o Google Cloud Platform (Cloud Run).

## 🚀 Recursos Principais

1. **Autenticação Firebase & Conta Google**:
   - Autenticação de usuários via Firebase Authentication com suporte a Conta Google (`GoogleAuthProvider`).
   - Permissão OAuth com escopo `https://www.googleapis.com/auth/photoslibrary.readonly` para integração direta com a galeria de fotos.
   - Cada roupeiro é estritamente isolado pelo UID do usuário no Cloud Firestore.
   - Suporte a modo convidado/demo para testes rápidos.

2. **Upload Versátil (Fotos, Pastas e Google Fotos)**:
   - **Upload de Fotos Individuais**: Seleção múltipla de arquivos do dispositivo ou computador (JPG, PNG, WEBP).
   - **Upload de Pasta Completa**: Seleção de pasta inteira com leitura recursiva de sub-pastas via atributo `webkitdirectory`.
   - **Busca e Importação do Google Fotos**: Interface modal interativa para buscar fotos da biblioteca do Google Fotos da conta conectada, pré-visualizar miniaturas e importar em lote com sugestão automática da data de criação como data de aquisição.

3. **Classificação Inteligente com Gemini**:
   - Análise multimodal via modelo **Gemini 3.7 Flash** (na Vertex AI):
     - **Classificação de Categoria**: Camisas & Camisetas, Calças, Casacos & Jaquetas, Bermudas & Shorts, Vestidos & Saias, Calçados, Acessórios, Moda Praia & Íntima, Outros.
     - **Tipo Específico**: Ex: "Camiseta Básica Gola Careca", "Calça Jeans Slim", "Blazer Alfaiataria".
     - **Cor Predominante**: Identificação do nome da cor em português e geração do código hexadecimal `#RRGGBB` para filtros visuais.
     - **Data de Aquisição**: Campo inicialmente em branco para posterior preenchimento pelo usuário (ou pré-preenchido se importado do Google Fotos).
     - **Descrição**: Descrição detalhada sugerida pela IA sobre tecido, corte e ocasião, totalmente editável pelo usuário.
     - **Bounding Box**: Delimitação espacial `[ymin, xmin, ymax, xmax]` da peça para recorte focado.

4. **Extração da Peça de Roupa ("Wardrobe" do Google Fotos)**:
   - Algoritmo de segmentação dedicado para vestuário (`u2net_cloth_seg` / `rembg`).
   - Isola exclusivamente a peça de roupa da foto original, removendo fundos complexos, manequins ou partes do corpo.
   - Gera um PNG recortado com transparência que é exibido no roupeiro como uma peça flutuante (com botão rápido para alternar entre o recorte e a foto original).

5. **Gerenciador de Guarda-Roupa & Montador de Looks**:
   - Filtro dinâmico por categoria com contadores em tempo real.
   - Filtro por paleta de cores predominantes.
   - Busca textual instantânea.
   - Modal de edição completo para atualizar tipo, categoria, cor, data de aquisição e descrição.
   - Montador interativo de looks ("Look Builder") para combinar Top, Bottom e Calçados.

---

## 🛠️ Arquitetura e Tecnologias

- **Backend**: Python 3.11, FastAPI, Uvicorn.
- **IA & Modelos**: Google Cloud Vertex AI (Gemini 3.7 Flash), Rembg com ONNX Runtime (`u2net_cloth_seg`).
- **Banco de Dados**: Cloud Firestore (Modo Nativo).
- **Armazenamento de Imagens**: Google Cloud Storage (`gs://roupeiro-virtual-media`).
- **Autenticação**: Firebase Authentication / Google Identity Platform.
- **Deploy**: Google Cloud Run (Container Docker, 4GiB RAM, 2 vCPUs).

---

## 🌐 Implantação (Cloud Run)

Defina as variáveis de ambiente necessárias (`GOOGLE_CLOUD_PROJECT`, `FIREBASE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.) no seu serviço do Cloud Run antes da implantação.

---

## 💻 Execução Local

```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Executar o servidor FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
Acesse em: `http://localhost:8080`
