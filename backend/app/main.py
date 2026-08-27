from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.app.recovery_service import (
    get_summary,
    get_recommendations,
)

from backend.app.recovery_agent import (
    execute_recovery,
    get_audit_log,
    get_recovery_metrics,
)


app = FastAPI(
    title="AI Revenue Recovery Causal Lab",
    description=(
        "AI-powered payment recovery and causal analysis "
        "platform with bounded recovery execution"
    ),
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "AI Revenue Recovery Causal Lab API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/api/recovery/summary")
def recovery_summary():
    return get_summary()


@app.get("/api/recovery/recommendations")
def recovery_recommendations():
    return get_recommendations()


@app.post("/api/recovery/execute/{payment_id}")
def recovery_execute(payment_id: str):
    try:
        return execute_recovery(payment_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


@app.get("/api/recovery/audit")
def recovery_audit():
    return get_audit_log()


@app.get("/api/recovery/metrics")
def recovery_metrics():
    return get_recovery_metrics()