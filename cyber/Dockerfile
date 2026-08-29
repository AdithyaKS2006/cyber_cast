FROM python:3.11-slim
RUN apt-get update && apt-get install -y \
    gcc g++ libpcap-dev tshark \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "crimecast.asgi:application"]
