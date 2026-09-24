FROM python:3.11-slim
RUN apt-get update && apt-get install -y \
    gcc g++ libpcap-dev tshark \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p logs media ml_models/saved_models && \
    SECRET_KEY="dummy-build-key" ALLOWED_HOSTS="*" python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "crimecast.asgi:application"]
