from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db, AsyncSessionLocal
from ..schemas import chat as chat_schemas
from ..models.conversation import Conversation
from ..models.message import Message
from ..sdk.wrapper import LLMWrapper
from ..config import settings
import uuid

router = APIRouter()


@router.post("/conversations", response_model=chat_schemas.Conversation)
async def create_conversation(
    payload: chat_schemas.ConversationCreate, db: AsyncSession = Depends(get_db)
):
    # Determine next chat title
    result = await db.execute(select(Conversation.title))
    existing_titles = result.scalars().all()
    
    count = 1
    while f"Chat {count}" in existing_titles:
        count += 1

    new_conv = Conversation(
        title=f"Chat {count}",
        provider=payload.provider or "anthropic",
        model=payload.model or "claude-sonnet-4-5",
        status="active"
    )
    db.add(new_conv)
    await db.commit()
    await db.refresh(new_conv)
    return new_conv


@router.get("/conversations", response_model=list[chat_schemas.Conversation])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).order_by(Conversation.created_at.desc()))
    return result.scalars().all()


@router.get("/conversations/{conversation_id}", response_model=chat_schemas.Conversation)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conv_id = uuid.UUID(conversation_id)
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.patch("/conversations/{conversation_id}", response_model=chat_schemas.Conversation)
async def update_conversation(
    conversation_id: str, payload: chat_schemas.ConversationUpdate, db: AsyncSession = Depends(get_db)
):
    conv_id = uuid.UUID(conversation_id)
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if payload.provider is not None:
        conv.provider = payload.provider
    if payload.model is not None:
        conv.model = payload.model
    await db.commit()
    await db.refresh(conv)
    return conv


from fastapi.responses import StreamingResponse
import json

@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str, payload: chat_schemas.MessageCreate, db: AsyncSession = Depends(get_db)
):
    # Retrieve conversation to get provider/model
    conv_id = uuid.UUID(conversation_id)
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Fetch existing message history before saving the new message
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
    )
    history = history_result.scalars().all()

    # Save user message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=payload.content
    )
    db.add(user_msg)
    await db.commit()

    # Build full message history for the LLM
    messages = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": payload.content})

    # Call LLM
    wrapper = LLMWrapper(
        provider=conv.provider,
        model=conv.model,
        ingest_url=settings.INGEST_URL,
    )

    response = await wrapper.chat(
        messages,
        conversation_id,
        stream=payload.stream
    )

    if payload.stream:
        async def stream_generator():
            full_content = ""
            async for chunk in response:
                content = chunk.get("content", "")
                full_content += content
                yield f"data: {json.dumps({'content': content})}\n\n"
            
            # Save assistant message after stream finishes
            async with AsyncSessionLocal() as session:
                assistant_msg = Message(
                    conversation_id=conv_id,
                    role="assistant",
                    content=full_content
                )
                session.add(assistant_msg)
                await session.commit()
            
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        # Save assistant message
        assistant_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=response["content"]
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)
        return assistant_msg


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conv_id = uuid.UUID(conversation_id)
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conv_id = uuid.UUID(conversation_id)
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    await db.delete(conv)
    await db.commit()
    return {"status": "deleted"}
