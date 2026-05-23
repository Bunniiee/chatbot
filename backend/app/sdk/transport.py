import httpx


async def ship_log(payload: dict, ingest_url: str) -> None:
    """Fire and forget. Never raises. Never blocks caller."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(ingest_url, json=payload)
    except Exception:
        pass
