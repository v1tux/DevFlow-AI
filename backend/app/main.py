from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analysis import router as analysis_router
from app.api.system import router as system_router
from app.auth.router import router as auth_router
from app.core.config import get_settings
from app.core.database import Base, engine
from app.models import analysis, user  # noqa: F401

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Copiloto de Back-End para análise de qualidade, segurança, arquitetura e performance de repositórios.",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(analysis_router)
app.include_router(system_router)