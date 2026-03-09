from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import auth, transactions, dashboard, upload

settings = get_settings()

app = FastAPI(
    title="Expense Tracker API",
    description="Multi-tenant expense tracking with Slip OCR and PDF statement parsing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth)
app.include_router(transactions)
app.include_router(dashboard)
app.include_router(upload)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
