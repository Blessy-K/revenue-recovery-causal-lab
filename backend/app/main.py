from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.recovery_service import get_summary, get_recommendations
app = FastAPI(
    title="AI Revenue Recovery Causal Lab",
    description="AI-powered payment recovery and causal analysis platform",
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