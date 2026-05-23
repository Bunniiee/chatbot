from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class MessageBase(BaseModel):
    content: str


class MessageCreate(MessageBase):
    stream: bool = False


class Message(MessageBase):
    id: UUID
    conversation_id: UUID
    role: str
    created_at: datetime
    inference_log_id: Optional[UUID] = None


class ConversationCreate(BaseModel):
    title: str
    provider: Optional[str] = "mock"
    model: Optional[str] = "mock-model"


class ConversationUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None


class Conversation(BaseModel):
    id: UUID
    title: str
    provider: str
    model: str
    status: str
    created_at: datetime
