"""
Cau hinh database SQLite va model luu tru cac ca chan doan benh.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from sqlalchemy import Column, DateTime, Float, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = BACKEND_DIR.parent / "data" / "plant_disease.db"

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DiagnosisCase(Base):
    __tablename__ = "diagnosis_cases"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)
    plant_name = Column(String, index=True, nullable=False)
    disease_name = Column(String, index=True, nullable=False)
    confidence = Column(Float, nullable=False)
    treatment = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
