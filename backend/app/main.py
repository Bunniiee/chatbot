from fastapi import FastAPI
from .routers import chat, ingest, metrics
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
