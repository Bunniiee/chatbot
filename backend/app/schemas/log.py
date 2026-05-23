from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class InferenceLogCreate(BaseModel):
    event_id: UUID
    conversation_id: UUID
    session_id: Optional[str] = None
    provider: str
    model: str
    request_ts: datetime
    response_ts: Optional[datetime] = None
    latency_ms: Optional[float] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    status: str
    http_status_code: Optional[int] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    input_preview: Optional[str] = None
    output_preview: Optional[str] = None
    sdk_version: Optional[str] = None
