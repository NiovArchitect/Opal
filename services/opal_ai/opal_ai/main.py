"""FastAPI entrypoint for Opal AI worker."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Response
from fastapi.responses import JSONResponse

from opal_ai import __version__
from opal_ai.worker import process_job

logger = logging.getLogger("opal_ai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="opal_ai", version=__version__, docs_url=None, redoc_url=None)


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
    logger.info(
        "job_received job_id=%s capability=%s trace_id=%s",
        payload.get("job_id"),
        payload.get("capability"),
        payload.get("trace_id"),
    )
    result = process_job(payload)
    status_code = 200
    if result.get("status") == "failed":
        status_code = 422
    elif result.get("status") == "refused":
        status_code = 200
    return JSONResponse(content=result, status_code=status_code)
