from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


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
    category_score: int | None = None


class MetricSeverityBreakdown(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class CategoryMetric(BaseModel):
    score: int
    findings_count: int = 0
    severity: MetricSeverityBreakdown = Field(
        default_factory=MetricSeverityBreakdown
    )


class AnalysisResponse(BaseModel):
    id: int
    repository_url: str | None
    project_name: str
    score: int
    summary: str
    findings: list[Finding]
    metrics: dict[str, CategoryMetric] | None = None
    score_explanation: list[str] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True