#!/usr/bin/env bash
# ==============================================================================
# Script de Deploy Completo & Idempotente - Roupeiro Virtual
# ==============================================================================
# Suporta:
#   1. Deploy do ZERO em um projeto GCP totalmente novo (habilita APIs, cria
#      banco Firestore, cria Bucket GCS, cria repositório Artifact Registry
#      e configura permissões IAM). No primeiro deploy, solicita a FIREBASE_API_KEY
#      e o GOOGLE_CLIENT_ID (via parâmetros de linha de comando ou prompt).
#   2. REDEPLOY rápido caso o projeto/serviço já tenha sido provisionado antes
#      (preservando os valores de FIREBASE_API_KEY e GOOGLE_CLIENT_ID já definidos
#      nas variáveis de ambiente do Cloud Run).
#
# Uso:
#   ./deploy.sh [OPÇÕES]
#
# Opções:
#   -p, --project PROJECT_ID       ID do Projeto Google Cloud (padrão: projeto ativo no gcloud)
#   -r, --region REGION            Região do Cloud Run e Artifact Registry (padrão: us-central1)
#   -s, --service SERVICE_NAME     Nome do serviço Cloud Run (padrão: roupeiro-virtual)
#   -b, --bucket BUCKET_NAME       Nome do bucket Cloud Storage (padrão: <PROJECT_ID>-media)
#   --firebase-api-key KEY         Firebase API Key (solicita interativamente no 1º deploy se omitido)
#   --google-client-id CLIENT_ID   Google OAuth Client ID (solicita interativamente no 1º deploy se omitido)
#   --gemini-model MODEL           Modelo Gemini (padrão: gemini-3.7-flash)
#   -h, --help                     Exibe esta mensagem de ajuda
# ==============================================================================

set -euo pipefail

# Cores para output
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

log_info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[AVISO]${NC} $*"; }
log_error() { echo -e "${RED}[ERRO]${NC} $*" >&2; }

# Valores padrão
PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
REGION="us-central1"
SERVICE_NAME="roupeiro-virtual"
BUCKET_NAME=""
GEMINI_MODEL="gemini-3.7-flash"
GEMINI_LOCATION="global"
ARTIFACT_REPO="roupeiro-virtual"
FIREBASE_API_KEY=""
GOOGLE_CLIENT_ID=""

usage() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

# Parse de argumentos
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project)
      PROJECT_ID="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -s|--service)
      SERVICE_NAME="$2"
      shift 2
      ;;
    -b|--bucket)
      BUCKET_NAME="$2"
      shift 2
      ;;
    --firebase-api-key)
      FIREBASE_API_KEY="$2"
      shift 2
      ;;
    --google-client-id)
      GOOGLE_CLIENT_ID="$2"
      shift 2
      ;;
    --gemini-model)
      GEMINI_MODEL="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      log_error "Opção desconhecida: $1"
      usage
      ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  log_error "Nenhum PROJECT_ID informado e nenhum projeto padrão configurado no gcloud."
  echo "Use: ./deploy.sh --project SEU_PROJECT_ID"
  exit 1
fi

if [[ -z "$BUCKET_NAME" ]]; then
  BUCKET_NAME="${PROJECT_ID}-media"
fi

echo "=============================================================================="
echo " 🚀 Iniciando Deploy do Roupeiro Virtual"
echo "------------------------------------------------------------------------------"
echo " • Projeto GCP       : ${PROJECT_ID}"
echo " • Região Cloud Run  : ${REGION}"
echo " • Serviço Cloud Run : ${SERVICE_NAME}"
echo " • Bucket de Mídia   : gs://${BUCKET_NAME}"
echo " • Modelo Gemini     : ${GEMINI_MODEL} (${GEMINI_LOCATION})"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 1. Habilitar APIs necessárias no Google Cloud (Idempotente)
# ------------------------------------------------------------------------------
log_info "1/7 Verificando e habilitando APIs necessárias no projeto ${PROJECT_ID}..."
REQUIRED_APIS=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "firestore.googleapis.com"
  "storage.googleapis.com"
  "aiplatform.googleapis.com"
)
gcloud services enable "${REQUIRED_APIS[@]}" --project "${PROJECT_ID}"
log_ok "APIs habilitadas com sucesso."

# ------------------------------------------------------------------------------
# 2. Provisionar banco de dados Cloud Firestore em Modo Nativo (Idempotente)
# ------------------------------------------------------------------------------
log_info "2/7 Verificando banco de dados Cloud Firestore..."
if gcloud firestore databases describe --database="(default)" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  log_ok "Banco Cloud Firestore (default) já existe no projeto."
else
  log_info "Criando banco Cloud Firestore em modo Nativo (${REGION})..."
  gcloud firestore databases create \
    --database="(default)" \
    --location="${REGION}" \
    --type="firestore-native" \
    --project="${PROJECT_ID}"
  log_ok "Banco Cloud Firestore criado com sucesso."
fi

# ------------------------------------------------------------------------------
# 3. Provisionar Bucket Google Cloud Storage para imagens (Idempotente)
# ------------------------------------------------------------------------------
log_info "3/7 Verificando Bucket Cloud Storage (gs://${BUCKET_NAME})..."
if gcloud storage buckets describe "gs://${BUCKET_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  log_ok "Bucket gs://${BUCKET_NAME} já existe."
else
  log_info "Criando Bucket gs://${BUCKET_NAME} na região ${REGION}..."
  gcloud storage buckets create "gs://${BUCKET_NAME}" \
    --location="${REGION}" \
    --uniform-bucket-level-access \
    --project="${PROJECT_ID}"
  log_ok "Bucket gs://${BUCKET_NAME} criado com sucesso."
fi

# ------------------------------------------------------------------------------
# 4. Provisionar Repositório no Artifact Registry (Idempotente)
# ------------------------------------------------------------------------------
log_info "4/7 Verificando repositório Docker no Artifact Registry (${ARTIFACT_REPO})..."
if gcloud artifacts repositories describe "${ARTIFACT_REPO}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" >/dev/null 2>&1; then
  log_ok "Repositório Artifact Registry '${ARTIFACT_REPO}' já existe."
else
  log_info "Criando repositório Docker '${ARTIFACT_REPO}' em ${REGION}..."
  gcloud artifacts repositories create "${ARTIFACT_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Repositório de imagens Docker do Roupeiro Virtual" \
    --project="${PROJECT_ID}"
  log_ok "Repositório Artifact Registry criado com sucesso."
fi

# ------------------------------------------------------------------------------
# 5. Configurar Variáveis de Ambiente (Firebase / Google Client ID) e IAM
# ------------------------------------------------------------------------------
log_info "5/7 Verificando variáveis de ambiente e permissões IAM da Service Account..."

# Se não foram informadas via flag, tenta reutilizar as que já estão no Cloud Run (Redeploy)
if [[ -z "${FIREBASE_API_KEY}" || -z "${GOOGLE_CLIENT_ID}" ]]; then
  if gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    SERVICE_JSON="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format=json 2>/dev/null || true)"
    if [[ -z "${FIREBASE_API_KEY}" && -n "${SERVICE_JSON}" ]]; then
      FIREBASE_API_KEY="$(echo "${SERVICE_JSON}" | python3 -c "import sys, json; envs = json.load(sys.stdin).get('spec',{}).get('template',{}).get('spec',{}).get('containers',[{}])[0].get('env',[]); print(next((e.get('value','') for e in envs if e.get('name')=='FIREBASE_API_KEY'), ''))" 2>/dev/null || true)"
    fi
    if [[ -z "${GOOGLE_CLIENT_ID}" && -n "${SERVICE_JSON}" ]]; then
      GOOGLE_CLIENT_ID="$(echo "${SERVICE_JSON}" | python3 -c "import sys, json; envs = json.load(sys.stdin).get('spec',{}).get('template',{}).get('spec',{}).get('containers',[{}])[0].get('env',[]); print(next((e.get('value','') for e in envs if e.get('name')=='GOOGLE_CLIENT_ID'), ''))" 2>/dev/null || true)"
    fi
  fi
fi

# Se ainda estiverem vazias (primeiro deploy), solicita ao usuário interativamente
if [[ -z "${FIREBASE_API_KEY}" ]]; then
  log_warn "FIREBASE_API_KEY não encontrada (primeiro deploy)."
  read -r -p "Informe a FIREBASE_API_KEY: " FIREBASE_API_KEY
fi

if [[ -z "${GOOGLE_CLIENT_ID}" ]]; then
  log_warn "GOOGLE_CLIENT_ID não encontrado (primeiro deploy)."
  read -r -p "Informe o GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
fi

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

log_info "Garantindo permissões IAM para a Service Account (${COMPUTE_SA})..."
ROLES=(
  "roles/datastore.user"
  "roles/storage.objectAdmin"
  "roles/aiplatform.user"
)
for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="${ROLE}" \
    --condition=None >/dev/null 2>&1 || true
done
log_ok "Permissões IAM configuradas."

# ------------------------------------------------------------------------------
# 6. Build da Imagem de Container via Cloud Build
# ------------------------------------------------------------------------------
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}/app:latest"
log_info "6/7 Executando build da imagem no Cloud Build (${IMAGE_URI})..."
gcloud builds submit \
  --tag "${IMAGE_URI}" \
  --project "${PROJECT_ID}"
log_ok "Imagem construída e enviada para ${IMAGE_URI}."

# ------------------------------------------------------------------------------
# 7. Deploy / Redeploy no Cloud Run
# ------------------------------------------------------------------------------
log_info "7/7 Implantando serviço '${SERVICE_NAME}' no Cloud Run (${REGION})..."
if gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud run services update "${SERVICE_NAME}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --clear-secrets >/dev/null 2>&1 || true
fi

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 20 \
  --timeout 300 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GCS_BUCKET_NAME=${BUCKET_NAME},GEMINI_MODEL=${GEMINI_MODEL},GOOGLE_CLOUD_LOCATION=${GEMINI_LOCATION},FIREBASE_API_KEY=${FIREBASE_API_KEY},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status.url)')"

echo ""
echo "=============================================================================="
echo -e " ${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo "------------------------------------------------------------------------------"
echo " 🌐 URL do Serviço Cloud Run: ${SERVICE_URL}"
echo "=============================================================================="
