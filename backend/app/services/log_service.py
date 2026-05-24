from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.log import InferenceLogCreate
from ..models.inference_log import InferenceLog


async def persist_log(payload: InferenceLogCreate, db: AsyncSession):
    new_log = InferenceLog(
        id=payload.event_id,
        conversation_id=payload.conversation_id,
        provider=payload.provider,
        model=payload.model,
        request_ts=payload.request_ts,
        response_ts=payload.response_ts,
        latency_ms=payload.latency_ms,
        stream_ttfb_ms=payload.stream_ttfb_ms,
        prompt_tokens=payload.prompt_tokens,
        completion_tokens=payload.completion_tokens,
        total_tokens=payload.total_tokens,
        status=payload.status,
        error_message=payload.error_message,
        input_preview=payload.input_preview,
        output_preview=payload.output_preview,
    )
    db.add(new_log)
    await db.commit()
