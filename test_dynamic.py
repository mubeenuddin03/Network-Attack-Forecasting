"""
Test A -> B -> C dynamic behavior.
Verifies that process_csv_for_dashboard produces DIFFERENT, data-driven results per file.
This mirrors exactly what app/app.py calls via process_csv_cached().
"""
import pandas as pd
from src.models.predict import process_csv_for_dashboard


def summarize(name, csv_path):
    results = process_csv_for_dashboard(csv_path, "models/baseline")
    time_min = results["window_start"].min().strftime("%H:%M")
    time_max = results["window_end"].max().strftime("%H:%M")
    attack_windows = int(results["future_attack_actual"].sum())
    risk = results["attack_probability"].mean() * 100
    return {
        "file": name,
        "windows": len(results),
        "time_range": f"{time_min}-{time_max}",
        "attack_windows": attack_windows,
        "avg_risk": round(risk, 1),
        "max_prob": round(results["attack_probability"].max() * 100, 1),
    }


print("=" * 60)
print("TEST A -> B -> C (distinct files, distinct results)")
print("=" * 60)

A = summarize("A.csv", "test_data/A.csv")
B = summarize("B.csv", "test_data/B.csv")
C = summarize("C.csv", "test_data/C.csv")

for r in (A, B, C):
    print(f"{r['file']}: windows={r['windows']}, range={r['time_range']}, "
          f"attacks={r['attack_windows']}, avg_risk={r['avg_risk']}%, max_prob={r['max_prob']}%")

# Assertions: different content must yield different results
assert A["windows"] != B["windows"] or A["time_range"] != B["time_range"], "A and B should differ"
assert B["windows"] != C["windows"] or B["time_range"] != C["time_range"], "B and C should differ"
assert A["attack_windows"] != C["attack_windows"], "A vs C attack counts should differ (different content)"
assert A["avg_risk"] != C["avg_risk"], "A vs C risk should differ"
assert A["time_range"] == "01:00-01:30", f"Expected A range 01:00-01:30, got {A['time_range']}"
assert B["time_range"] == "02:00-02:30", f"Expected B range 02:00-02:30, got {B['time_range']}"
assert C["time_range"] == "03:00-03:30", f"Expected C range 03:00-03:30, got {C['time_range']}"

print("\nPASS: Each file produces distinct, content-driven results.")
print("PASS: No stale/cached data across A/B/C.")
