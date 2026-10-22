#!/usr/bin/env bash
# Google Cloud Run + Cloud Storage + Cloud Scheduler дээр backend-ийг байршуулна (PROGRESS D60, docs/CLOUD_RUN.md).
# Google Cloud Shell-д ажиллуулна (gcloud, git, openssl бэлэн). Дахин ажиллуулахад аюулгүй — байгаа нөөцийг алгасна.
#
#   PROJECT_ID=minii-tusul bash backend/deploy/cloudrun.sh
#
# Нууц түлхүүрийг (CoinGecko) скрипт өөрөө асууна — дэлгэцэнд харагдахгүй, Secret Manager-т хадгална.
# Бүх нөөц үнэгүй түвшинд багтахаар: us-central1, min 0 / max 1 instance, 512 MiB, хүсэлтийн үеийн CPU.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID=... гэж төслийн ID-гаа зааж өгнө үү}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-kripto-api}"
BUCKET="${BUCKET:-${PROJECT_ID}-kripto-state}"
SA_NAME="${SA_NAME:-kripto-api}"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SEED_BASE_URL="${SEED_BASE_URL:-https://cerebrumanthropic.github.io/kripto-7hon}"
SITE_URL="${SITE_URL:-https://vaspfrcweekly.expo.app}"
JOB="${JOB:-kripto-live}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

step "Төсөл: $PROJECT_ID, бүс: $REGION"
gcloud config set project "$PROJECT_ID" >/dev/null

step "API-уудыг идэвхжүүлж байна (1–2 мин)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com

step "Төлвийн bucket: gs://$BUCKET"
if ! gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET" --location="$REGION" \
    --uniform-bucket-level-access --public-access-prevention
fi

step "Service account: $SA"
if ! gcloud iam service-accounts describe "$SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" --display-name="kripto-api (Cloud Run)"
fi
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA" --role="roles/storage.objectUser" >/dev/null

step "Нууцууд (Secret Manager)"
if ! gcloud secrets describe coingecko-demo-key >/dev/null 2>&1; then
  read -rsp "CoinGecko Demo API түлхүүрээ оруулна уу (CG-...; харагдахгүй): " CG_KEY; echo
  printf '%s' "$CG_KEY" | gcloud secrets create coingecko-demo-key --data-file=- --replication-policy=automatic
  unset CG_KEY
fi
if ! gcloud secrets describe kripto-admin-token >/dev/null 2>&1; then
  openssl rand -hex 24 | tr -d '\n' | gcloud secrets create kripto-admin-token --data-file=- --replication-policy=automatic
fi
for s in coingecko-demo-key kripto-admin-token; do
  gcloud secrets add-iam-policy-binding "$s" --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

CONTACT_EMAIL="${CONTACT_EMAIL:-}"
if [ -z "$CONTACT_EMAIL" ]; then
  read -rp "SEC-ийн RSS-д холбоо барих имэйл (GitHub-ийн CONTACT_EMAIL-тэй ижил; хоосон бол SEC алгасна): " CONTACT_EMAIL
fi

step "Cloud Run руу байршуулж байна (Cloud Build, 3–5 мин)"
gcloud run deploy "$SERVICE" --source "$SRC" --region "$REGION" --quiet \
  --service-account "$SA" --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --memory 512Mi --cpu 1 --cpu-boost --timeout 300 \
  --set-env-vars "STATE_BUCKET=$BUCKET,SEED_BASE_URL=$SEED_BASE_URL,SITE_URL=$SITE_URL,CONTACT_EMAIL=$CONTACT_EMAIL" \
  --set-secrets "COINGECKO_DEMO_API_KEY=coingecko-demo-key:latest,ADMIN_TOKEN=kripto-admin-token:latest"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"

step "Cloud Scheduler: цаг бүрийн :07 (UTC) → $URL/admin/refresh"
TOKEN="$(gcloud secrets versions access latest --secret kripto-admin-token)"
JOB_ARGS=(--location "$REGION" --schedule "7 * * * *" --time-zone "Etc/UTC" --uri "$URL/admin/refresh"
  --http-method POST --headers "Authorization=Bearer $TOKEN" --attempt-deadline 300s --max-retry-attempts 2)
if gcloud scheduler jobs describe "$JOB" --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB" "${JOB_ARGS[@]}" >/dev/null
else
  gcloud scheduler jobs create http "$JOB" "${JOB_ARGS[@]}" >/dev/null
fi
unset TOKEN

step "Анхны татлагыг одоо ажиллуулж байна"
gcloud scheduler jobs run "$JOB" --location "$REGION"
echo "1–2 минутын дараа шалгана уу:"
echo "  $URL/healthz"
echo "  $URL/live/market.json"
printf '\n\033[1;32mБэлэн. Сервисийн хаяг: %s\033[0m\n' "$URL"
