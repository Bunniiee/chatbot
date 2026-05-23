from abc import ABC, abstractmethod
import httpx
from ..config import settings

class BaseProvider(ABC):
    @abstractmethod
    async def complete(self, messages: list, model: str, stream: bool = False, **kwargs):
        pass


class MockProvider(BaseProvider):
    async def complete(self, messages: list, model: str, stream: bool = False, **kwargs):
        if stream:
            async def generator():
                full_text = f"Mock streaming response from {model}."
                for word in full_text.split():
                    yield {"content": word + " ", "role": "assistant"}
            return generator()
        return {"content": f"Mock response from {model}.", "role": "assistant"}


class AnthropicProvider(BaseProvider):
    async def complete(self, messages: list, model: str, stream: bool = False, **kwargs):
        if not settings.ANTHROPIC_API_KEY:
            return {"content": "Anthropic API Key not configured.", "role": "assistant"}
        
        async with httpx.AsyncClient() as client:
            if stream:
                async def generator():
                    import json
                    input_tokens = 0
                    output_tokens = 0
                    async with client.stream(
                        "POST",
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": settings.ANTHROPIC_API_KEY,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "max_tokens": 1024,
                            "stream": True
                        },
                        timeout=30.0
                    ) as response:
                        async for line in response.aiter_lines():
                            if line.startswith("data:"):
                                try:
                                    data = json.loads(line[5:])
                                    if data["type"] == "message_start":
                                        input_tokens = data.get("message", {}).get("usage", {}).get("input_tokens", 0)
                                    elif data["type"] == "content_block_delta":
                                        yield {"content": data["delta"]["text"], "role": "assistant"}
                                    elif data["type"] == "message_delta":
                                        output_tokens = data.get("usage", {}).get("output_tokens", 0)
                                except:
                                    continue
                    yield {
                        "content": "",
                        "usage": {
                            "prompt_tokens": input_tokens,
                            "completion_tokens": output_tokens,
                            "total_tokens": input_tokens + output_tokens,
                        },
                    }
                return generator()

            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": 1024,
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            usage = data.get("usage", {})
            return {
                "content": data["content"][0]["text"],
                "role": "assistant",
                "prompt_tokens": usage.get("input_tokens"),
                "completion_tokens": usage.get("output_tokens"),
                "total_tokens": (usage.get("input_tokens") or 0) + (usage.get("output_tokens") or 0),
            }


class OpenAIProvider(BaseProvider):
    async def complete(self, messages: list, model: str, stream: bool = False, **kwargs):
        if not settings.OPENAI_API_KEY:
            return {"content": "OpenAI API Key not configured.", "role": "assistant"}

        async with httpx.AsyncClient() as client:
            if stream:
                async def generator():
                    import json
                    async with client.stream(
                        "POST",
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "stream": True,
                            "stream_options": {"include_usage": True},
                        },
                        timeout=30.0
                    ) as response:
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                if line[6:] == "[DONE]":
                                    break
                                try:
                                    data = json.loads(line[6:])
                                    if data.get("usage"):
                                        u = data["usage"]
                                        yield {
                                            "content": "",
                                            "usage": {
                                                "prompt_tokens": u.get("prompt_tokens"),
                                                "completion_tokens": u.get("completion_tokens"),
                                                "total_tokens": u.get("total_tokens"),
                                            },
                                        }
                                        continue
                                    delta = data["choices"][0]["delta"]
                                    if "content" in delta and delta["content"]:
                                        yield {"content": delta["content"], "role": "assistant"}
                                except:
                                    continue
                return generator()

            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            usage = data.get("usage", {})
            return {
                "content": data["choices"][0]["message"]["content"],
                "role": "assistant",
                "prompt_tokens": usage.get("prompt_tokens"),
                "completion_tokens": usage.get("completion_tokens"),
                "total_tokens": usage.get("total_tokens"),
            }


providers = {
    "mock": MockProvider(),
    "anthropic": AnthropicProvider(),
    "openai": OpenAIProvider(),
}


async def call_llm(provider: str, messages: list, model: str, stream: bool = False, **kwargs):
    provider_instance = providers.get(provider)
    if not provider_instance:
        raise ValueError(f"Provider {provider} not supported")
    return await provider_instance.complete(messages, model, stream=stream, **kwargs)
