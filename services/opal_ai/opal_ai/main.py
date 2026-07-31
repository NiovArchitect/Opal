"""FastAPI entrypoint for Opal AI worker."""

from __future__ import annotations

import logging
import os
import threading
from typing import Any

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import JSONResponse

from opal_ai import __version__
from opal_ai.worker import process_job

logger = logging.getLogger("opal_ai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="opal_ai", version=__version__, docs_url=None, redoc_url=None)

_lock = threading.Lock()
_request_count = 0
_last_job_id: str | None = None
_DEBUG = os.getenv("OPAL_AI_DEBUG", "").lower() in {"1", "true", "yes"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "opal_ai", "version": __version__}


@app.post("/v1/jobs")
def create_job(payload: dict[str, Any], response: Response) -> JSONResponse:
    """
    Execute a bounded AI job.

    Never grants consent. Never mutates messaging state.
    Does not persist user context after the response.
    """
    global _request_count, _last_job_id

    with _lock:
        _request_count += 1
        _last_job_id = str(payload.get("job_id")) if payload.get("job_id") else None
        count = _request_count

    logger.info(
        "job_received job_id=%s capability=%s trace_id=%s request_count=%s",
        payload.get("job_id"),
        payload.get("capability"),
        payload.get("trace_id"),
        count,
    )
    result = process_job(payload)
    status_code = 200
    if result.get("status") == "failed":
        status_code = 422
    elif result.get("status") == "refused":
        status_code = 200
    return JSONResponse(content=result, status_code=status_code)


@app.get("/v1/debug/request-count")
def request_count() -> dict[str, Any]:
    if not _DEBUG:
        raise HTTPException(status_code=404, detail="not_found")
    with _lock:
        return {"request_count": _request_count, "last_job_id": _last_job_id}


@app.post("/v1/debug/reset-count")
def reset_count() -> dict[str, Any]:
    if not _DEBUG:
        raise HTTPException(status_code=404, detail="not_found")
    global _request_count, _last_job_id
    with _lock:
        _request_count = 0
        _last_job_id = None
    return {"request_count": 0, "last_job_id": None}
