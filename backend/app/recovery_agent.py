from datetime import datetime
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[2]

PREDICTIONS_FILE = BASE_DIR / "data" / "recovery_predictions.csv"
PAYMENTS_FILE = BASE_DIR / "data" / "payments.csv"
AUDIT_FILE = BASE_DIR / "data" / "recovery_audit.csv"

UPLIFT_THRESHOLD = 0.10
MAX_RETRY_ATTEMPTS = 1


def load_data():
    if not PREDICTIONS_FILE.exists():
        raise FileNotFoundError(
            "Recovery predictions file not found. "
            "Run backend/ml/causal_model.py first."
        )

    if not PAYMENTS_FILE.exists():
        raise FileNotFoundError(
            "Payment dataset not found. "
            "Run backend/ml/generate_data.py first."
        )

    predictions = pd.read_csv(PREDICTIONS_FILE)
    payments = pd.read_csv(PAYMENTS_FILE)

    return predictions, payments


def execute_recovery(payment_id):
    predictions, payments = load_data()

    payment_id = payment_id.strip().upper()

    prediction = predictions[
        predictions["payment_id"].astype(str).str.upper()
        == payment_id
    ]

    payment = payments[
        payments["payment_id"].astype(str).str.upper()
        == payment_id
    ]

    if prediction.empty:
        raise ValueError(
            f"Prediction not found for {payment_id}"
        )

    if payment.empty:
        raise ValueError(
            f"Payment not found for {payment_id}"
        )

    prediction = prediction.iloc[0]
    payment = payment.iloc[0]

    uplift = float(prediction["uplift"])
    amount = float(payment["amount"])

    existing_audit = _get_existing_events(payment_id)

    if existing_audit:
        last_event = existing_audit[-1]

        terminal_actions = {
            "closed",
            "manual_review",
            "no_intervention",
        }

        if last_event.get("next_action") in terminal_actions:
            return {
            "timestamp": datetime.now().isoformat(
                timespec="seconds"
            ),
            "payment_id": payment_id,
            "amount": amount,
            "failure_reason": payment["failure_reason"],
            "predicted_uplift": uplift,
            "decision": last_event.get(
                "decision",
                "do_not_retry",
            ),
            "action": "already_processed",
            "attempt_number": int(
                float(
                    last_event.get(
                        "attempt_number",
                        0,
                    )
                )
            ),
            "result": last_event.get(
                "result",
                "already_processed",
            ),
            "recovered_amount": float(
                last_event.get(
                    "recovered_amount",
                    0,
                )
            ),
            "incremental_revenue": float(
                last_event.get(
                    "incremental_revenue",
                    0,
                )
            ),
            "status": "already_processed",
            "stop_reason": "payment_already_processed",
            "next_action": last_event.get(
                "next_action",
                "closed",
            ),
        }
    timestamp = datetime.now().isoformat(
        timespec="seconds"
    )

    if uplift < UPLIFT_THRESHOLD:
        audit = {
            "timestamp": timestamp,
            "payment_id": payment_id,
            "amount": amount,
            "failure_reason": payment["failure_reason"],
            "predicted_uplift": uplift,
            "decision": "do_not_retry",
            "action": "none",
            "attempt_number": 0,
            "result": "not_executed",
            "recovered_amount": 0.0,
            "incremental_revenue": 0.0,
            "status": "stopped",
            "stop_reason": (
                "uplift_below_intervention_threshold"
            ),
            "next_action": "no_intervention",
        }

        _save_audit(audit)

        return audit

    previous_retry_attempts = sum(
        1
        for event in existing_audit
        if event.get("action") == "retry"
    )

    if previous_retry_attempts >= MAX_RETRY_ATTEMPTS:
        audit = {
            "timestamp": timestamp,
            "payment_id": payment_id,
            "amount": amount,
            "failure_reason": payment["failure_reason"],
            "predicted_uplift": uplift,
            "decision": "retry",
            "action": "retry",
            "attempt_number": previous_retry_attempts,
            "result": "failed",
            "recovered_amount": 0.0,
            "incremental_revenue": 0.0,
            "status": "stopped",
            "stop_reason": (
                "maximum_retry_attempts_reached"
            ),
            "next_action": "manual_review",
        }

        _save_audit(audit)

        return audit

    audit = {
        "timestamp": timestamp,
        "payment_id": payment_id,
        "amount": amount,
        "failure_reason": payment["failure_reason"],
        "predicted_uplift": uplift,
        "decision": "retry",
        "action": "retry",
        "attempt_number": previous_retry_attempts + 1,
        "result": "failed",
        "recovered_amount": 0.0,
        "incremental_revenue": 0.0,
        "status": "stopped",
        "stop_reason": "",
        "next_action": "retry_execution",
    }

    recovered = int(payment["recovered"]) == 1

    if recovered:
        audit["result"] = "recovered"
        audit["recovered_amount"] = amount
        audit["incremental_revenue"] = float(
            prediction["expected_incremental_revenue"]
        )
        audit["status"] = "stopped"
        audit["stop_reason"] = "payment_recovered"
        audit["next_action"] = "closed"

    else:
        audit["result"] = "failed"
        audit["recovered_amount"] = 0.0
        audit["incremental_revenue"] = 0.0
        audit["status"] = "stopped"
        audit["stop_reason"] = (
            "maximum_retry_attempts_reached"
        )
        audit["next_action"] = "manual_review"

    _save_audit(audit)

    return audit


def _get_existing_events(payment_id):
    if not AUDIT_FILE.exists():
        return []

    audit = pd.read_csv(AUDIT_FILE)

    if audit.empty:
        return []

    events = audit[
        audit["payment_id"].astype(str).str.upper()
        == str(payment_id).upper()
    ]

    if events.empty:
        return []

    return events.to_dict(orient="records")


def get_audit_log():
    if not AUDIT_FILE.exists():
        return []

    audit = pd.read_csv(AUDIT_FILE)

    return audit.to_dict(orient="records")


def get_recovery_metrics():
    predictions, payments = load_data()

    total_payments = len(predictions)

    recommended = predictions[
        predictions["recommendation"] == "retry"
    ]

    eligible_for_retry = len(recommended)

    policy_blocked = predictions[
        predictions["recommendation"] == "do_not_retry"
    ]

    stopped_by_policy = len(policy_blocked)

    # Read actual agent executions from audit log
    if not AUDIT_FILE.exists():
        return {
            "payments_evaluated": int(total_payments),
            "eligible_for_retry": int(eligible_for_retry),
            "interventions_executed": 0,
            "payments_recovered": 0,
            "manual_reviews": 0,
            "recovered_revenue": 0.0,
            "estimated_incremental_revenue": round(
                float(
                    recommended[
                        "expected_incremental_revenue"
                    ].sum()
                ),
                2,
            ),
            "stopped_by_policy": int(stopped_by_policy),
            "execution_recovery_rate": 0.0,
        }

    audit = pd.read_csv(AUDIT_FILE)

    if audit.empty:
        return {
            "payments_evaluated": int(total_payments),
            "eligible_for_retry": int(eligible_for_retry),
            "interventions_executed": 0,
            "payments_recovered": 0,
            "manual_reviews": 0,
            "recovered_revenue": 0.0,
            "estimated_incremental_revenue": round(
                float(
                    recommended[
                        "expected_incremental_revenue"
                    ].sum()
                ),
                2,
            ),
            "stopped_by_policy": int(stopped_by_policy),
            "execution_recovery_rate": 0.0,
        }

    # Ignore duplicate "already_processed" requests.
    actual_executions = audit[
        audit["action"].isin(["retry", "none"])
    ].copy()

    # One payment should count as one actual workflow execution.
    latest_events = (
        actual_executions
        .sort_values("timestamp")
        .drop_duplicates(
            subset=["payment_id"],
            keep="last",
        )
    )

    interventions_executed = len(
        latest_events[
            latest_events["decision"] == "retry"
        ]
    )

    recovered = latest_events[
        latest_events["result"] == "recovered"
    ]

    manual_reviews = latest_events[
        latest_events["next_action"] == "manual_review"
    ]

    payments_recovered = len(recovered)

    recovered_revenue = float(
        recovered["recovered_amount"].sum()
    )

    execution_recovery_rate = (
        payments_recovered / interventions_executed
        if interventions_executed > 0
        else 0.0
    )

    return {
        "payments_evaluated": int(total_payments),

        "eligible_for_retry": int(
            eligible_for_retry
        ),

        "interventions_executed": int(
            interventions_executed
        ),

        "payments_recovered": int(
            payments_recovered
        ),

        "manual_reviews": int(
            len(manual_reviews)
        ),

        "recovered_revenue": round(
            recovered_revenue,
            2,
        ),

        "estimated_incremental_revenue": round(
            float(
                recommended[
                    "expected_incremental_revenue"
                ].sum()
            ),
            2,
        ),

        "stopped_by_policy": int(
            stopped_by_policy
        ),

        "execution_recovery_rate": round(
            execution_recovery_rate,
            4,
        ),
    }


def _save_audit(event):
    audit_df = pd.DataFrame([event])

    if AUDIT_FILE.exists():
        audit_df.to_csv(
            AUDIT_FILE,
            mode="a",
            header=False,
            index=False,
        )
    else:
        audit_df.to_csv(
            AUDIT_FILE,
            index=False,
        )