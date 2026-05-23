from sqlalchemy import Column, String, DateTime, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base
import uuid
from sqlalchemy.sql import func


class InferenceLog(Base):
    __tablename__ = "inference_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    request_ts = Column(DateTime(timezone=True), nullable=False)
    response_ts = Column(DateTime(timezone=True))
    latency_ms = Column(Numeric(10, 2))
    status = Column(String, nullable=False)
    input_preview = Column(String)
    output_preview = Column(String)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
