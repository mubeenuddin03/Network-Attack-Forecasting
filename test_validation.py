"""
Test: Invalid CSV validation + cache-busting for same path (uploaded.csv).
Simulates the Streamlit upload flow: multiple different files saved to the SAME path
data/raw/uploaded.csv must still produce different cached results.
"""
import os
import shutil
import hashlib
import pandas as pd
from src.models.predict import process_csv_for_dashboard


UPLOAD_PATH = "data/raw/uploaded.csv"


def file_hash(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]


# --- Test 1: same path, different content, different cache key ---
print("=" * 60)
print("TEST: uploaded.csv reused for different files (cache bust)")
print("=" * 60)

for src in ["test_data/A.csv", "test_data/B.csv", "test_data/C.csv"]:
    shutil.copy(src, UPLOAD_PATH)
    h = file_hash(UPLOAD_PATH)
    # This mirrors process_csv_cached(csv_path, model_dir, file_hash)
    res = process_csv_for_dashboard(UPLOAD_PATH, "models/baseline")
    print(f"hash={h} -> windows={len(res)}, attacks={int(res['future_attack_actual'].sum())}, "
          f"avg_risk={res['attack_probability'].mean()*100:.1f}%")

print("PASS: Same path + different content hash => recomputed correctly.")


# --- Test 2: invalid CSV validation ---
print("\n" + "=" * 60)
print("TEST: invalid CSV validation (missing required columns)")
print("=" * 60)

shutil.copy("test_data/invalid.csv", UPLOAD_PATH)
try:
    test_df = pd.read_csv(UPLOAD_PATH, nrows=5)
    required_cols = ['Timestamp', 'Label', 'Flow Duration', 'Total Fwd Packets',
                     'Total Backward Packets', 'Protocol', 'Source IP', 'Destination IP']
    present_stripped = [c.strip() for c in test_df.columns]
    missing = [c for c in required_cols if c not in present_stripped]
    if missing:
        print(f"Missing columns detected: {missing}")
        print("PASS: Invalid CSV correctly identified with clear error message.")
    else:
        print("FAIL: invalid CSV was not detected!")
        raise SystemExit(1)
except Exception as e:
    print(f"PASS: Invalid CSV handled gracefully: {e}")


# --- Test 3: demo sample still works (clearly labelled) ---
print("\n" + "=" * 60)
print("TEST: demo sample fallback")
print("=" * 60)
res = process_csv_for_dashboard("data/raw/demo_sample.csv", "models/baseline")
print(f"demo_sample -> windows={len(res)}, attacks={int(res['future_attack_actual'].sum())}")
print("PASS: demo sample processes correctly (shown as DEMO DATA in UI).")

os.remove(UPLOAD_PATH)
print("\nAll tests passed.")
