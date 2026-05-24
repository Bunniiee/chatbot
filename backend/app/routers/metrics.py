from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from ..database import get_db
from ..models.inference_log import InferenceLog
from datetime import datetime, timezone, timedelta

router = APIRouter()


@router.get("/metrics/summary")
async def get_metrics_summary(db: AsyncSession = Depends(get_db)):
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


@router.get("/metrics/timeseries")
async def get_metrics_timeseries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT
                TO_CHAR(DATE_TRUNC('hour', request_ts), 'HH24:MI') AS hour,
                ROUND(AVG(latency_ms)::numeric, 2) AS avg_latency,
                COUNT(*) AS requests,
                COUNT(*) FILTER (WHERE status = 'error') AS errors
            FROM inference_logs
            WHERE request_ts >= NOW() - INTERVAL '12 hours'
            GROUP BY DATE_TRUNC('hour', request_ts)
            ORDER BY DATE_TRUNC('hour', request_ts) ASC
        """)
    )
    rows = result.fetchall()
    return [
        {
            "time": row[0],
            "latency": float(row[1]) if row[1] else 0,
            "requests": int(row[2]),
            "errors": int(row[3]),
        }
        for row in rows
    ]
