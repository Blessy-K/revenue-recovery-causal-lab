import pandas as pd

df = pd.read_csv("data/payments.csv")

control = df[df["treatment_group"] == 0]
treatment = df[df["treatment_group"] == 1]

control_rate = control["recovered"].mean()
treatment_rate = treatment["recovered"].mean()

observed_difference = treatment_rate - control_rate

expected_recoveries = len(treatment) * control_rate
actual_recoveries = treatment["recovered"].sum()

incremental_recoveries = actual_recoveries - expected_recoveries

incremental_revenue = (
    treatment.loc[treatment["recovered"] == 1, "amount"].sum()
    - treatment["amount"].sum() * control_rate
)

print(f"Control recovery rate: {control_rate:.2%}")
print(f"Treatment recovery rate: {treatment_rate:.2%}")
print(f"Observed difference: {observed_difference:.2%}")
print(f"Actual treatment recoveries: {actual_recoveries}")
print(f"Expected treatment recoveries: {expected_recoveries:.0f}")
print(f"Estimated incremental recoveries: {incremental_recoveries:.0f}")
print(f"Estimated incremental revenue: Rs. {incremental_revenue:,.2f}")