from urllib.parse import urlparse
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pathlib import Path
import shutil
import tempfile
import zipfile

from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.models.analysis import Analysis
from app.schemas.analysis import AnalysisResponse, RepositoryAnalyzeRequest
from app.services.ai_service import AIService
from app.services.analyzer_service import AnalyzerService
from app.services.repository_service import RepositoryService
from app.services.report_service import ReportService
from app.services.stack_detection_service import StackDetectionService
from app.services.ai_review_service import AIReviewService

router = APIRouter(
    prefix="/analyses",
    tags=["Analyses"],
    dependencies=[Depends(get_current_user)],
)

repo_service = RepositoryService()
analyzer_service = AnalyzerService()
ai_service = AIService()
report_service = ReportService()
stack_detection_service = StackDetectionService()
ai_review_service = AIReviewService()

def extract_repository_metadata(repository_url: str) -> dict:
    parsed_url = urlparse(repository_url)
    path_parts = parsed_url.path.strip("/").split("/")

    if len(path_parts) < 2:
        return {
            "project_name": "Repositório GitHub",
            "project_author": "Autor não identificado",
        }

    owner = path_parts[0]
    repo_name = path_parts[1].replace(".git", "")

    display_name = repo_name.replace("-", " ").replace("_", " ").strip()

    return {
        "project_name": display_name,
        "project_author": owner,
    }

def build_analysis_response(analysis: Analysis) -> dict:
    findings = analysis.findings or []
    metrics = analyzer_service.get_metrics(findings, analysis.score)

    ai_review = ai_review_service.enrich_analysis(
        analysis.project_name,
        analysis.score,
        metrics,
        findings,
    )

    return {
        "id": analysis.id,
        "repository_url": analysis.repository_url,
        "project_name": analysis.project_name,
        "score": analysis.score,
        "summary": analysis.summary,
        "findings": findings,
        "metrics": metrics,
        "score_explanation": analyzer_service.get_score_explanation(
            metrics,
            findings,
            analysis.score,
        ),
        "ai_review": ai_review,
        "created_at": analysis.created_at,
    }

@router.post("/repository", response_model=AnalysisResponse)
def analyze_repository(
    payload: RepositoryAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    repo_path = repo_service.clone(str(payload.repository_url))

    try:
        repository_metadata = extract_repository_metadata(str(payload.repository_url))
        project_name = repository_metadata["project_name"]
        score, findings = analyzer_service.analyze(repo_path)
        summary = ai_service.generate_summary(project_name, findings, score)
        detected_stack = stack_detection_service.detect(repo_path)

        findings = [
            {
                "type": "detected_stack",
                "scores": detected_stack,
            },
            *findings,
        ]

        analysis = Analysis(
            user_id=current_user["user_id"],
            repository_url=str(payload.repository_url),
            project_name=project_name,
            score=score,
            summary=summary,
            findings=findings,
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        return build_analysis_response(analysis)

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    finally:
        repo_service.cleanup(repo_path)


@router.post("/upload", response_model=AnalysisResponse)
def analyze_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail="Envie um arquivo .zip contendo o projeto.",
        )

    temp_dir = Path(tempfile.mkdtemp(prefix="devflow_upload_"))
    zip_path = temp_dir / file.filename

    try:
        with zip_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir / "project")

        project_root = temp_dir / "project"
        score, findings = analyzer_service.analyze(project_root)
        category_scores = analyzer_service.get_category_scores(findings)
        detected_stack = stack_detection_service.detect(project_root)

        findings = [
            {
                "type": "category_scores",
                "scores": category_scores,
            },
            {
                "type": "detected_stack",
                "scores": detected_stack,
            },
            *findings,
        ]

        project_name = file.filename.replace(".zip", "")
        summary = ai_service.generate_summary(project_name, findings, score)

        analysis = Analysis(
            user_id=current_user["user_id"],
            repository_url=None,
            project_name=project_name,
            score=score,
            summary=summary,
            findings=findings,
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        return build_analysis_response(analysis)

    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=400, detail="Arquivo ZIP inválido.") from exc

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@router.get("/compare")
def compare_analyses(
    base_id: int = Query(..., description="ID da análise base, geralmente a mais antiga"),
    target_id: int = Query(..., description="ID da análise alvo, geralmente a mais recente"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    base_analysis = (
        db.query(Analysis)
        .filter(
            Analysis.id == base_id,
            Analysis.user_id == current_user["user_id"],
        )
        .first()
    )

    target_analysis = (
        db.query(Analysis)
        .filter(
            Analysis.id == target_id,
            Analysis.user_id == current_user["user_id"],
        )
        .first()
    )

    if not base_analysis:
        raise HTTPException(status_code=404, detail="Análise base não encontrada.")

    if not target_analysis:
        raise HTTPException(status_code=404, detail="Análise alvo não encontrada.")

    base_findings = base_analysis.findings or []
    target_findings = target_analysis.findings or []

    base_score = base_analysis.score or 0
    target_score = target_analysis.score or 0

    score_delta = target_score - base_score

    base_total_findings = len(base_findings)
    target_total_findings = len(target_findings)
    findings_delta = target_total_findings - base_total_findings

    def count_by_severity(findings: list[dict]) -> dict:
        result = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0,
            "unknown": 0,
        }

        for finding in findings:
            if not isinstance(finding, dict):
                result["unknown"] += 1
                continue

            severity = finding.get("severity") or "unknown"
            severity = str(severity).lower()

            if severity not in result:
                severity = "unknown"

            result[severity] += 1

        return result

    base_severities = count_by_severity(base_findings)
    target_severities = count_by_severity(target_findings)

    severity_delta = {
        severity: target_severities.get(severity, 0) - base_severities.get(severity, 0)
        for severity in base_severities
    }

    if score_delta > 0:
        status = "improved"
        summary = "A qualidade técnica melhorou em relação à análise base."
    elif score_delta < 0:
        status = "regressed"
        summary = "A qualidade técnica piorou em relação à análise base."
    else:
        status = "stable"
        summary = "A qualidade técnica permaneceu estável entre as análises."

    return {
        "base_analysis": {
            "id": base_analysis.id,
            "project_name": base_analysis.project_name,
            "score": base_score,
            "total_findings": base_total_findings,
            "created_at": base_analysis.created_at,
            "severities": base_severities,
        },
        "target_analysis": {
            "id": target_analysis.id,
            "project_name": target_analysis.project_name,
            "score": target_score,
            "total_findings": target_total_findings,
            "created_at": target_analysis.created_at,
            "severities": target_severities,
        },
        "comparison": {
            "status": status,
            "summary": summary,
            "score_delta": score_delta,
            "findings_delta": findings_delta,
            "severity_delta": severity_delta,
        },
    }

@router.get("", response_model=list[AnalysisResponse])
def list_analyses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    analyses = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user["user_id"])
        .order_by(Analysis.created_at.desc())
        .limit(30)
        .all()
    )

    return [build_analysis_response(analysis) for analysis in analyses]


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    analysis = (
        db.query(Analysis)
        .filter(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user["user_id"],
        )
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")

    return build_analysis_response(analysis)


@router.get("/{analysis_id}/report")
def download_report(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    analysis = (
        db.query(Analysis)
        .filter(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user["user_id"],
        )
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada.")

    pdf = report_service.build_pdf(analysis)

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=devflow-analysis-{analysis_id}.pdf"
        },
    )