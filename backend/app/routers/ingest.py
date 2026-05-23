from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.log import InferenceLogCreate
from ..services.log_service import persist_log

router = APIRouter()


@router.post("/ingest/log", status_code=status.HTTP_202_ACCEPTED)
async def ingest_log(payload: InferenceLogCreate, db: AsyncSession = Depends(get_db)):
    await persist_log(payload, db)
    return {"status": "accepted"}
