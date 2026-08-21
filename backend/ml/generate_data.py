import os
import numpy as np
import pandas as pd


np.random.seed(42)

n = 10000

payment_ids = [f"P{i:05d}" for i in range(1, n + 1)]
customer_ids = [f"C{i:05d}" for i in np.random.randint(1, 3001, n)]
customer_reliability = np.random.beta(5, 3, n)
amount = np.round(
    np.random.lognormal(mean=6.2, sigma=0.7, size=n),
    2
)

payment_method = np.random.choice(
    ["card", "upi", "netbanking", "wallet"],
    n,
    p=[0.35, 0.35, 0.20, 0.10]
)

bank = np.random.choice(
    ["HDFC", "ICICI", "SBI", "Axis", "Other"],
    n
)

failure_reason = np.random.choice(
    [
        "insufficient_funds",
        "bank_declined",
        "network_error",
        "timeout",
        "limit_exceeded"
    ],
    n,
    p=[0.25, 0.25, 0.20, 0.15, 0.15]
)

previous_success_count = np.random.poisson(4, n)
previous_failure_count = np.random.poisson(2, n)

treatment_group = np.random.binomial(1, 0.5, n)

retry_delay_minutes = np.where(
    treatment_group == 1,
    np.random.choice([10, 30, 60, 120], n),
    0
)

base_probability = (
    0.20
    + 0.25 * customer_reliability
    + 0.025 * np.minimum(previous_success_count, 8)
    - 0.02 * np.minimum(previous_failure_count, 8)
    + 0.04 * (payment_method == "upi")
    + 0.03 * (failure_reason == "network_error")
    - 0.04 * (failure_reason == "insufficient_funds")
)

customer_uplift = (
    0.03
    + 0.04 * (previous_success_count >= 5)
    + 0.03 * (payment_method == "upi")
    - 0.02 * (failure_reason == "insufficient_funds")
)

base_probability = np.clip(base_probability, 0.05, 0.85)
customer_uplift = np.clip(customer_uplift, -0.02, 0.15)

treatment_probability = (
    base_probability
    + treatment_group * customer_uplift
)

treatment_probability = np.clip(
    treatment_probability,
    0.02,
    0.95
)

recovered = np.random.binomial(
    1,
    treatment_probability
)

recovery_time_minutes = np.where(
    recovered == 1,
    np.random.randint(5, 240, n),
    np.nan
)

retry_attempted = treatment_group

data = pd.DataFrame({
    "payment_id": payment_ids,
    "customer_id": customer_ids,
    "amount": amount,
    "payment_method": payment_method,
    "bank": bank,
    "failure_reason": failure_reason,
    "previous_success_count": previous_success_count,
    "previous_failure_count": previous_failure_count,
    "retry_attempted": retry_attempted,
    "retry_delay_minutes": retry_delay_minutes,
    "recovered": recovered,
    "recovery_time_minutes": recovery_time_minutes,
    "treatment_group": treatment_group
})

os.makedirs("data", exist_ok=True)

data.to_csv("data/payments.csv", index=False)

print(f"Generated {len(data)} payment records")
print("Saved to data/payments.csv")
print()
print(data.head())