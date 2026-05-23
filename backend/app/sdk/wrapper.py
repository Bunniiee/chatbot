import time
import uuid
from .transport import ship_log
from ..services.llm_service import call_llm
from datetime import datetime, timezone


class LLMWrapper:
    def __init__(self, provider: str, model: str, ingest_url: str):
        self.provider = provider
        self.model = model
        self.ingest_url = ingest_url

    async def chat(
        self,
        messages: list[dict],
        conversation_id: str,
        session_id: str = None,
        stream: bool = False,
        **kwargs,
    ):
        start = time.monotonic()
        request_ts = datetime.now(timezone.utc)
        ttfb = None
        
        try:
            response = await call_llm(self.provider, messages, self.model, stream=stream, **kwargs)
            
            if stream:
                async def logging_generator():
                    full_content = ""
                    nonlocal ttfb
                    usage_data = {}
                    async for chunk in response:
                        if chunk.get("usage"):
                            usage_data = chunk["usage"]
                            continue
                        if ttfb is None:
                            ttfb = (time.monotonic() - start) * 1000
                        full_content += chunk.get("content", "")
                        yield chunk

                    latency = (time.monotonic() - start) * 1000
                    log_payload = {
                        "event_id": str(uuid.uuid4()),
                        "conversation_id": conversation_id,
                        "provider": self.provider,
                        "model": self.model,
                        "request_ts": request_ts.isoformat(),
                        "latency_ms": latency,
                        "stream_ttfb_ms": ttfb,
                        "status": "success",
                        "prompt_tokens": usage_data.get("prompt_tokens"),
                        "completion_tokens": usage_data.get("completion_tokens"),
                        "total_tokens": usage_data.get("total_tokens"),
                        "input_preview": str(messages[-1].get("content", ""))[:200] if messages else "",
                        "output_preview": full_content[:200],
                    }
                    await ship_log(log_payload, self.ingest_url)
                return logging_generator()
            else:
                latency = (time.monotonic() - start) * 1000
                log_payload = {
                    "event_id": str(uuid.uuid4()),
                    "conversation_id": conversation_id,
                    "provider": self.provider,
                    "model": self.model,
                    "request_ts": request_ts.isoformat(),
                    "latency_ms": latency,
                    "status": "success",
                    "prompt_tokens": response.get("prompt_tokens"),
                    "completion_tokens": response.get("completion_tokens"),
                    "total_tokens": response.get("total_tokens"),
                    "input_preview": str(messages[-1].get("content", ""))[:200] if messages else "",
                    "output_preview": str(response.get("content", ""))[:200],
                }
                await ship_log(log_payload, self.ingest_url)
                return response
        except Exception as e:
            latency = (time.monotonic() - start) * 1000
            log_payload = {
                "event_id": str(uuid.uuid4()),
                "conversation_id": conversation_id,
                "provider": self.provider,
                "model": self.model,
                "request_ts": request_ts.isoformat(),
                "latency_ms": latency,
                "status": "error",
                "error_message": str(e),
                "input_preview": str(messages[-1].get("content", ""))[:200] if messages else "",
            }
            await ship_log(log_payload, self.ingest_url)
            raise
