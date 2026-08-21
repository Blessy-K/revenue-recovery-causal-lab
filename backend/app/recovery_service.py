from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]
PREDICTIONS_FILE = BASE_DIR / "data" / "recovery_predictions.csv"


def load_predictions():
    if not PREDICTIONS_FILE.exists():
        raise FileNotFoundError(
            "Recovery predictions file not found. "
            "Run backend/ml/causal_model.py first."
        )

    return pd.read_csv(PREDICTIONS_FILE)


def get_summary():
    df = load_predictions()

    retry = df[df["recommendation"] == "retry"]

    return {
        "total_payments": len(df),
        "payments_recommended_for_retry": len(retry),
        "payments_not_recommended_for_retry": len(df) - len(retry),
        "estimated_incremental_revenue": float(
    round(retry["expected_incremental_revenue"].sum(), 2)
),
"average_uplift": float(
    round(df["uplift"].mean(), 4)
)
    }

def get_recommendations():
    df = pd.read_csv("data/recovery_predictions.csv")

    recommended = df[df["recommendation"] == "retry"].copy()

    recommended = recommended.sort_values(
        by="uplift",
        ascending=False
    )

    return recommended[
        [
            "payment_id",
            "amount",
            "probability_with_retry",
            "probability_without_retry",
            "uplift",
            "recommendation",
            "expected_incremental_revenue"
        ]
    ].to_dict(orient="records")