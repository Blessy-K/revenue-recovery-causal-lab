from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]

PREDICTIONS_FILE = BASE_DIR / "data" / "recovery_predictions.csv"
PAYMENTS_FILE = BASE_DIR / "data" / "payments.csv"


def load_predictions():
    if not PREDICTIONS_FILE.exists():
        raise FileNotFoundError(
            "Recovery predictions file not found. "
            "Run backend/ml/causal_model.py first."
        )

    return pd.read_csv(PREDICTIONS_FILE)


def load_payments():
    if not PAYMENTS_FILE.exists():
        raise FileNotFoundError(
            "Payment dataset not found. "
            "Run backend/ml/generate_data.py first."
        )

    return pd.read_csv(PAYMENTS_FILE)


def get_summary():
    predictions = load_predictions()
    payments = load_payments()

    retry = predictions[
        predictions["recommendation"] == "retry"
    ]

    negative = int(
        (predictions["uplift"] < 0).sum()
    )

    zero_to_five = int(
        (
            (predictions["uplift"] >= 0)
            & (predictions["uplift"] < 0.05)
        ).sum()
    )

    five_to_ten = int(
        (
            (predictions["uplift"] >= 0.05)
            & (predictions["uplift"] < 0.10)
        ).sum()
    )

    above_ten = int(
        (predictions["uplift"] >= 0.10).sum()
    )

    treatment_group = payments[
        payments["treatment_group"] == 1
    ]

    control_group = payments[
        payments["treatment_group"] == 0
    ]

    treatment_recovery_rate = (
        treatment_group["recovered"].mean() * 100
        if not treatment_group.empty
        else 0.0
    )

    control_recovery_rate = (
        control_group["recovered"].mean() * 100
        if not control_group.empty
        else 0.0
    )

    observed_treatment_effect = (
        treatment_recovery_rate - control_recovery_rate
    )

    total_payments = len(predictions)
    targeted_payments = len(retry)

    protected_percentage = (
        (
            (total_payments - targeted_payments)
            / total_payments
        )
        * 100
        if total_payments > 0
        else 0.0
    )

    intervention_percentage = (
        (
            targeted_payments
            / total_payments
        )
        * 100
        if total_payments > 0
        else 0.0
    )

    return {
        "total_payments": int(total_payments),

        "payments_recommended_for_retry": int(
            targeted_payments
        ),

        "payments_not_recommended_for_retry": int(
            total_payments - targeted_payments
        ),

        "estimated_incremental_revenue": float(
            round(
                retry[
                    "expected_incremental_revenue"
                ].sum(),
                2,
            )
        ),

        "average_uplift": float(
            round(
                predictions["uplift"].mean(),
                4,
            )
        ),

        "targeted_percentage": round(
            intervention_percentage,
            2,
        ),

        "protected_percentage": round(
            protected_percentage,
            2,
        ),

        "treatment_recovery_rate": round(
            treatment_recovery_rate,
            2,
        ),

        "control_recovery_rate": round(
            control_recovery_rate,
            2,
        ),

        "observed_treatment_effect": round(
            observed_treatment_effect,
            2,
        ),

        "uplift_segments": {
            "negative": negative,
            "zero_to_five": zero_to_five,
            "five_to_ten": five_to_ten,
            "above_ten": above_ten,
        },
    }


def get_recommendations():
    predictions = load_predictions()

    recommended = predictions[
        predictions["recommendation"] == "retry"
    ].copy()

    recommended = recommended.sort_values(
        by="uplift",
        ascending=False,
    )

    return recommended[
        [
            "payment_id",
            "amount",
            "probability_with_retry",
            "probability_without_retry",
            "uplift",
            "recommendation",
            "expected_incremental_revenue",
        ]
    ].to_dict(orient="records")