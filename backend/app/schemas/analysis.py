from datetime import datetime
from typing import Any

from pydantic import BaseModel, HttpUrl


class RepositoryAnalyzeRequest(BaseModel):
    repository_url: HttpUrl


class Finding(BaseModel):
    category: str | None = None
    severity: str | None = None
    file: str | None = None
    message: str | None = None
    recommendation: str | None = None
    priority: str | None = None
    type: str | None = None
    scores: dict[str, Any] | None = None


class AnalysisResponse(BaseModel):
    id: int
    repository_url: str | None
    project_name: str
    score: int
    summary: str
    findings: list[Finding]
    created_at: datetime

    class Config:
        from_attributes = True