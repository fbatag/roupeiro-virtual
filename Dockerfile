FROM python:3.11-slim

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Cloud Run defaults to PORT 8080
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
