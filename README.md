# LLM Observability Platform

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

A full-stack multi-provider LLM chatbot with a built-in observability and inference logging pipeline.

---

## Features

- Multi-provider support — Anthropic, OpenAI, Mock
- Token-by-token streaming responses
- Stop generation mid-stream
- Per-conversation model selector (persisted)
- Inference log ingestion pipeline
- Token count capture (streaming + non-streaming)
- Latency and TTFB instrumentation
- Metrics dashboard
- Database migrations via Alembic
- Docker Compose one-command setup

---

## Running the App

### Option 1 — Docker Compose

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY and/or OPENAI_API_KEY (optional — Mock works without keys)

docker compose up --build
```

---

### Option 2 — Local Development

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

pip install -r requirements.txt

cp .env.example .env
# Set DATABASE_URL and API keys in .env

python -m alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```


