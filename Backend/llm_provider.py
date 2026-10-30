"""
llm_provider.py
---------------
Centralized LLM provider with robust multi-model and multi-provider fallback.

Supports:
- Groq models:
  1) qwen/qwen3.8-27b
  2) openai/gpt-oss-120b
  3) openai/gpt-oss-20b
  4) llama-3.3-70b-versatile
  5) llama-3.1-8b-instant
- Google Gemini models:
  1) gemini-2.5-flash
  2) gemini-1.5-flash
  3) gemini-1.5-pro

If any model fails for ANY reason (model not found 404, rate limit 429, timeout,
server error 500/503), it automatically tries the next model in the tier, then
falls back to the secondary provider.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Sequence

from dotenv import load_dotenv

# Ensure .env is loaded regardless of the working directory
_backend_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_backend_dir / ".env")
load_dotenv()

logger = logging.getLogger("llm_provider")

DEFAULT_GROQ_MODELS = (
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
)

DEFAULT_GEMINI_MODELS = (
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
)


def _get_groq_models() -> tuple[str, ...]:
    custom = os.getenv("GROQ_MODEL")
    if custom:
        return (custom,) + tuple(m for m in DEFAULT_GROQ_MODELS if m != custom)
    return DEFAULT_GROQ_MODELS


def _get_gemini_models() -> tuple[str, ...]:
    custom = os.getenv("GEMINI_MODEL")
    if custom:
        return (custom,) + tuple(m for m in DEFAULT_GEMINI_MODELS if m != custom)
    return DEFAULT_GEMINI_MODELS


def _get_groq_llm(model: str):
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY is not set in Backend/.env")
    from langchain_groq import ChatGroq

    return ChatGroq(
        api_key=key,
        model=model,
        temperature=0,
        max_tokens=1024,
        request_timeout=30,
    )


def _get_gemini_llm(model: str = "gemini-2.5-flash"):
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        raise RuntimeError("GOOGLE_API_KEY is not set in Backend/.env")
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=model,
        temperature=0,
        google_api_key=key,
        request_timeout=30,
    )


def get_llm():
    """
    Return a functioning LLM instance by testing configured models.
    """
    from langchain_core.messages import HumanMessage, SystemMessage

    test_messages = [
        SystemMessage(content="Reply with: OK"),
        HumanMessage(content="OK"),
    ]

    errors: list[str] = []
    groq_key = os.getenv("GROQ_API_KEY")
    google_key = os.getenv("GOOGLE_API_KEY")

    if groq_key:
        for model in _get_groq_models():
            try:
                groq = _get_groq_llm(model)
                _ = groq.invoke(test_messages)
                return groq
            except Exception as e:
                errors.append(f"Groq ({model}): {e}")
                continue

    if google_key:
        for model in _get_gemini_models():
            try:
                gemini = _get_gemini_llm(model)
                _ = gemini.invoke(test_messages)
                return gemini
            except Exception as e:
                errors.append(f"Gemini ({model}): {e}")
                continue

    raise RuntimeError(f"No working LLM found. Errors: {' | '.join(errors)}")


def chat_with_fallback(messages: Sequence[Any]) -> str:
    """
    Invoke LLM with resilient multi-tier fallback.
    Tries all Groq models first, then falls back to Google Gemini models.
    """
    errors: list[str] = []
    groq_key = os.getenv("GROQ_API_KEY")
    google_key = os.getenv("GOOGLE_API_KEY")

    # 1. Try Groq
    if groq_key:
        for model in _get_groq_models():
            try:
                groq = _get_groq_llm(model)
                resp = groq.invoke(list(messages))
                content = (getattr(resp, "content", None) or "").strip()
                if content:
                    return content
                errors.append(f"Groq ({model}): empty response")
            except Exception as e:
                logger.warning("Groq model '%s' failed: %s. Trying next fallback...", model, e)
                errors.append(f"Groq ({model}): {e}")
                continue

    # 2. Try Gemini
    if google_key:
        for model in _get_gemini_models():
            try:
                gemini = _get_gemini_llm(model)
                resp = gemini.invoke(list(messages))
                content = (getattr(resp, "content", None) or "").strip()
                if content:
                    return content
                errors.append(f"Gemini ({model}): empty response")
            except Exception as e:
                logger.warning("Gemini model '%s' failed: %s. Trying next fallback...", model, e)
                errors.append(f"Gemini ({model}): {e}")
                continue

    all_err_str = " | ".join(errors) if errors else "No LLM API keys provided (GROQ_API_KEY or GOOGLE_API_KEY missing in Backend/.env)."
    raise RuntimeError(f"All LLM providers failed. Details: {all_err_str}")
