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

## 🌐 Implantação Automatizada no Google Cloud Run (`deploy.sh`)

O repositório inclui o script idempotente `./deploy.sh`, que automatiza tanto o **deploy inicial do zero** em um novo projeto GCP quanto o **redeploy** contínuo em um ambiente já configurado.

### 1. Deploy do Zero em um Projeto Novo
Ao executar em um projeto GCP recém-criado, o script executa automaticamente:
- Habilitação das APIs necessárias (`run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `storage.googleapis.com`, `aiplatform.googleapis.com`).
- Criação do banco de dados **Cloud Firestore** (`(default)`) em modo Nativo.
- Criação do bucket no **Cloud Storage** (`gs://<PROJECT_ID>-media`).
- Criação do repositório Docker no **Artifact Registry**.
- Configuração das permissões IAM (`roles/datastore.user`, `roles/storage.objectAdmin`, `roles/aiplatform.user`) para a Service Account do Cloud Run.
- Solicitação (interativa ou via flags) das variáveis `FIREBASE_API_KEY` e `GOOGLE_CLIENT_ID`, configurando-as diretamente como variáveis de ambiente normais do Cloud Run.
- Build da imagem via **Cloud Build** e deploy no **Cloud Run**.

```bash
chmod +x deploy.sh
./deploy.sh --project SEU_PROJECT_ID \
  --firebase-api-key "SUA_FIREBASE_API_KEY" \
  --google-client-id "SEU_GOOGLE_CLIENT_ID"
```
*(Se omitir `--firebase-api-key` ou `--google-client-id` no primeiro deploy, o script solicitará interativamente no terminal).*

### 2. Redeploy (Atualização de Código)
Para implantar novas versões em um projeto já provisionado (preservando automaticamente as variáveis `FIREBASE_API_KEY` e `GOOGLE_CLIENT_ID` já salvas no serviço Cloud Run e o banco de dados):

```bash
./deploy.sh --project SEU_PROJECT_ID
```

#### Opções adicionais do `deploy.sh`:
- `-p, --project PROJECT_ID`: ID do Projeto GCP (padrão: projeto ativo no `gcloud`).
- `-r, --region REGION`: Região do Cloud Run e Artifact Registry (padrão: `us-central1`).
- `-s, --service SERVICE_NAME`: Nome do serviço no Cloud Run (padrão: `roupeiro-virtual`).
- `-b, --bucket BUCKET_NAME`: Nome do bucket Cloud Storage (padrão: `<PROJECT_ID>-media`).
- `--firebase-api-key KEY`: Firebase API Key (solicitada interativamente no 1º deploy se omitida).
- `--google-client-id CLIENT_ID`: Google OAuth Client ID (solicitado interativamente no 1º deploy se omitido).
- `--gemini-model MODEL`: Modelo Gemini na Vertex AI (padrão: `gemini-3.7-flash`).

---

## 💻 Execução Local

```bash
# 1. Copiar o template de variáveis de ambiente
cp .env.example .env

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Executar o servidor FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
Acesse em: `http://localhost:8080`
