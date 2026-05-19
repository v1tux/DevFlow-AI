from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.models.analysis import Analysis
from app.models.user import User

router = APIRouter(tags=["System"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": "connected",
    }


@router.get("/metrics")
def metrics(db: Session = Depends(get_db)):
    total_analyses = db.query(Analysis).count()
    total_users = db.query(User).count()

    scores = db.query(Analysis.score).all()
    average_score = (
        round(sum(score[0] for score in scores) / len(scores), 2)
        if scores
        else 0
    )

    return {
        "total_users": total_users,
        "total_analyses": total_analyses,
        "average_score": average_score,
    }