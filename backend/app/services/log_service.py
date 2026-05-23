from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas.log import InferenceLogCreate
from ..models.inference_log import InferenceLog


async def persist_log(payload: InferenceLogCreate, db: AsyncSession):
    new_log = InferenceLog(**payload.model_dump())
    db.add(new_log)
    await db.commit()
