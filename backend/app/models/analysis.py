from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import mapped_column, relationship

from app.core.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = mapped_column(Integer, primary_key=True, index=True)
    user_id = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    repository_url = mapped_column(String(500), nullable=True)
    project_name = mapped_column(String(180), index=True)
    score = mapped_column(Integer, default=0)
    summary = mapped_column(Text)
    findings = mapped_column(JSON, default=list)
    created_at = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="analyses")