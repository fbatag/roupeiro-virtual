#!/usr/bin/env bash
# ==============================================================================
# Script de Deploy Completo & Idempotente - Roupeiro Virtual
# ==============================================================================
# Suporta:
#   1. Deploy do ZERO em um projeto GCP totalmente novo (habilita APIs, cria
#      banco Firestore, cria Bucket GCS, cria repositório Artifact Registry,
#      cria Secrets em branco no Secret Manager e configura permissões IAM).
#   2. REDEPLOY rápido caso o projeto/serviço já tenha sido provisionado antes
#      (preservando os valores já preenchidos nos Secrets e o banco de dados).
#
# Uso:
#   ./deploy.sh [OPÇÕES]
#
# Opções:
#   -p, --project PROJECT_ID       ID do Projeto Google Cloud (padrão: projeto ativo no gcloud)
#   -r, --region REGION            Região do Cloud Run e Artifact Registry (padrão: us-central1)
#   -s, --service SERVICE_NAME     Nome do serviço Cloud Run (padrão: roupeiro-virtual)
#   -b, --bucket BUCKET_NAME       Nome do bucket Cloud Storage (padrão: <PROJECT_ID>-media)
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
  "secretmanager.googleapis.com"
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
# 5. Provisionar Secrets no Secret Manager e Permissões IAM (Idempotente)
# ------------------------------------------------------------------------------
log_info "5/7 Verificando Secrets no Secret Manager e permissões da Service Account..."
SECRETS_LIST=("GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "FIREBASE_API_KEY")
NEW_SECRETS_CREATED=false

for SECRET_NAME in "${SECRETS_LIST[@]}"; do
  if gcloud secrets describe "${SECRET_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    log_ok "Secret '${SECRET_NAME}' já existe (valor atual preservado)."
  else
    log_warn "Secret '${SECRET_NAME}' não encontrado. Criando com valor em branco para preenchimento manual..."
    echo -n " " | gcloud secrets create "${SECRET_NAME}" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="${PROJECT_ID}"
    NEW_SECRETS_CREATED=true
    log_ok "Secret '${SECRET_NAME}' criado com versão inicial em branco."
  fi
done

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

log_info "Garantindo permissões IAM para a Service Account (${COMPUTE_SA})..."
ROLES=(
  "roles/secretmanager.secretAccessor"
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
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 20 \
  --timeout 300 \
  --update-secrets="GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,FIREBASE_API_KEY=FIREBASE_API_KEY:latest" \
  --update-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GCS_BUCKET_NAME=${BUCKET_NAME},GEMINI_MODEL=${GEMINI_MODEL},GOOGLE_CLOUD_LOCATION=${GEMINI_LOCATION}"

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status.url)')"

echo ""
echo "=============================================================================="
echo -e " ${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo "------------------------------------------------------------------------------"
echo " 🌐 URL do Serviço Cloud Run: ${SERVICE_URL}"
echo "=============================================================================="

if [[ "${NEW_SECRETS_CREATED}" == "true" ]]; then
  echo ""
  log_warn "ATENÇÃO: Novos secrets foram criados em branco no Secret Manager."
  echo " Preencha os valores reais no console do Secret Manager ou via terminal:"
  echo ""
  echo "   echo -n \"SEU_CLIENT_ID\"     | gcloud secrets versions add GOOGLE_CLIENT_ID     --data-file=- --project ${PROJECT_ID}"
  echo "   echo -n \"SEU_CLIENT_SECRET\" | gcloud secrets versions add GOOGLE_CLIENT_SECRET --data-file=- --project ${PROJECT_ID}"
  echo "   echo -n \"SUA_FIREBASE_KEY\"  | gcloud secrets versions add FIREBASE_API_KEY  --data-file=- --project ${PROJECT_ID}"
  echo ""
fi
