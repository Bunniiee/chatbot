from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..models.inference_log import InferenceLog

router = APIRouter()


@router.get("/metrics/summary")
async def get_metrics_summary(db: AsyncSession = Depends(get_db)):
    # Aggregated data based on inference_logs in db
    result = await db.execute(select(func.count(InferenceLog.id)))
    total_requests = result.scalar()

    if total_requests == 0:
        return {"avg_latency": 0, "total_requests": 0, "error_rate": 0}

    result = await db.execute(select(func.avg(InferenceLog.latency_ms)))
    avg_latency = result.scalar() or 0

    result = await db.execute(
        select(func.count(InferenceLog.id)).where(InferenceLog.status == "error")
    )
    errors = result.scalar()

    return {
        "avg_latency": round(float(avg_latency), 2),
        "total_requests": total_requests,
        "error_rate": round((errors / total_requests) * 100, 2),
    }
