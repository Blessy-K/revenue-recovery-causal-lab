import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline


df = pd.read_csv("data/payments.csv")

features = [
    "amount",
    "payment_method",
    "bank",
    "failure_reason",
    "previous_success_count",
    "previous_failure_count"
]

target = "recovered"
treatment = "treatment_group"

X = df[features]
y = df[target]
t = df[treatment]

categorical_features = [
    "payment_method",
    "bank",
    "failure_reason"
]

numeric_features = [
    "amount",
    "previous_success_count",
    "previous_failure_count"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numeric",
            "passthrough",
            numeric_features
        )
    ]
)

model_treated = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "model",
            RandomForestClassifier(
    n_estimators=300,
    max_depth=8,
    min_samples_leaf=20,
    random_state=42,
    class_weight="balanced"
)
        )
    ]
)

model_control = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "model",
            RandomForestClassifier(
    n_estimators=300,
    max_depth=8,
    min_samples_leaf=20,
    random_state=42,
    class_weight="balanced"
)
        )
    ]
)

treated_mask = t == 1
control_mask = t == 0

model_treated.fit(
    X[treated_mask],
    y[treated_mask]
)

model_control.fit(
    X[control_mask],
    y[control_mask]
)

prob_treated = model_treated.predict_proba(X)[:, 1]
prob_control = model_control.predict_proba(X)[:, 1]

uplift = prob_treated - prob_control

df["probability_with_retry"] = prob_treated
df["probability_without_retry"] = prob_control
df["uplift"] = uplift

print(df[
    [
        "payment_id",
        "probability_with_retry",
        "probability_without_retry",
        "uplift"
    ]
].head(10))

print()
print(f"Average predicted probability with retry: {prob_treated.mean():.4f}")
print(f"Average predicted probability without retry: {prob_control.mean():.4f}")
print(f"Average predicted uplift: {uplift.mean():.4f}")
actual_control_rate = y[control_mask].mean()
actual_treatment_rate = y[treated_mask].mean()
actual_treatment_effect = actual_treatment_rate - actual_control_rate

print()
print(f"Actual control recovery rate: {actual_control_rate:.4f}")
print(f"Actual treatment recovery rate: {actual_treatment_rate:.4f}")
print(f"Actual treatment effect: {actual_treatment_effect:.4f}")
df["recommendation"] = np.where(
    df["uplift"] >= 0.10,
    "retry",
    "do_not_retry"
)

df["expected_incremental_revenue"] = (
    df["uplift"] * df["amount"]
)

recommended = df[df["recommendation"] == "retry"]

print()
print("Recovery recommendations")
print(df["recommendation"].value_counts())

print()
print(f"Payments recommended for retry: {len(recommended)}")
print(
    f"Potential incremental revenue: "
    f"Rs. {recommended['expected_incremental_revenue'].sum():,.2f}"
)

print()
print(
    recommended[
        [
            "payment_id",
            "amount",
            "uplift",
            "recommendation",
            "expected_incremental_revenue"
        ]
    ].head(10)
)

df["uplift_bucket"] = pd.cut(
    df["uplift"],
    bins=[-1, 0, 0.05, 0.10, 1],
    labels=[
        "negative",
        "0_to_5_percent",
        "5_to_10_percent",
        "above_10_percent"
    ]
)

bucket_summary = df.groupby(
    "uplift_bucket",
    observed=True
).agg(
    payments=("payment_id", "count"),
    average_uplift=("uplift", "mean"),
    recovery_rate=("recovered", "mean"),
    average_amount=("amount", "mean"),
    estimated_incremental_revenue=(
        "expected_incremental_revenue",
        "sum"
    )
)

print()
print("Uplift segment analysis")
print(bucket_summary)

segment_effect = df.groupby(
    ["uplift_bucket", "treatment_group"],
    observed=True
)["recovered"].agg(
    payments="count",
    recoveries="sum",
    recovery_rate="mean"
)

print()
print("Treatment effect by uplift segment")
print(segment_effect)

output_columns = [
    "payment_id",
    "amount",
    "probability_with_retry",
    "probability_without_retry",
    "uplift",
    "recommendation",
    "expected_incremental_revenue",
    "uplift_bucket"
]

df[output_columns].to_csv(
    "data/recovery_predictions.csv",
    index=False
)

print()
print("Saved predictions to data/recovery_predictions.csv")