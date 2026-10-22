# Cloud Run-д зориулсан image (PROGRESS D60). Build: `gcloud run deploy --source backend` (Cloud Build)
# эсвэл локалд `docker build -t kripto-api backend`.
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.13 /uv /bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never

# Хамаарлыг тусад нь (кодоо өөрчлөхөд cache-ээс)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY src ./src
RUN uv sync --frozen --no-dev

# Cloud Run-ийн диск санах ойд байрладаг, instance унтахад устна — төлөв STATE_BUCKET-д
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/tmp/kripto/public-data \
    STORE_DIR=/tmp/kripto/store

# Cloud Run PORT-ийг өөрөө өгнө (анхдагч 8080)
CMD ["sh", "-c", "exec kripto serve --host 0.0.0.0 --port ${PORT:-8080}"]
