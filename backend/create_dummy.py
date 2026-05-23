import asyncio
from app.database import AsyncSessionLocal
from app.models.conversation import Conversation
import uuid


async def create_dummy_conversation():
    async with AsyncSessionLocal() as session:
        conv = Conversation(
            id=uuid.UUID("00000000-0000-0000-0000-000000000000"), title="New Chat"
        )
        session.add(conv)
        await session.commit()
        print("Created dummy conversation")


asyncio.run(create_dummy_conversation())
