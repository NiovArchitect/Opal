"""Pydantic models for request/response (defense in depth alongside JSON Schema)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ContextItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["message_body", "message_note", "synthetic_prompt"]
    value: str = Field(max_length=2000)
    source_id: str = Field(min_length=1, max_length=128)


class AiJobRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["0.1.0"]
    job_id: UUID
    idempotency_key: str = Field(min_length=8, max_length=128)
    capability: str
    requester_user_id: UUID
    subject_user_id: UUID
    conversation_id: UUID
    message_id: UUID
    consent_proof_id: UUID
    context: list[ContextItem] = Field(max_length=5)
    requested_at: datetime
    deadline_at: datetime
    trace_id: str = Field(min_length=8, max_length=128)


class ModelMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Literal["local"] = "local"
    model: Literal["deterministic-echo"] = "deterministic-echo"
    model_version: Literal["0.1.0"] = "0.1.0"


class Safety(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["allowed", "refused"]
    reasons: list[str] = Field(default_factory=list, max_length=20)


class EchoOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    normalized_text: str = Field(max_length=8000)
    character_count: int = Field(ge=0)
    context_item_count: int = Field(ge=0, le=5)


class AiJobResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["0.1.0"] = "0.1.0"
    job_id: UUID
    idempotency_key: str
    capability: str
    status: Literal["completed", "refused", "failed"]
    output: EchoOutput | None
    model_metadata: ModelMetadata
    safety: Safety
    completed_at: datetime
    trace_id: str

    def to_public_dict(self) -> dict[str, Any]:
        data = self.model_dump(mode="json")
        return data
