"""Create 3 test CSV files (A, B, C) from the Friday dataset with different time ranges."""
import pandas as pd
from pathlib import Path

Path("test_data").mkdir(exist_ok=True)

df = pd.read_csv("data/raw/Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv")
df.columns = df.columns.str.strip()
df["Timestamp"] = pd.to_datetime(df["Timestamp"], format="%m/%d/%Y %H:%M")
print("Time range:", df["Timestamp"].min(), "to", df["Timestamp"].max())

slices = {
    "A.csv": ("01:00", "01:30"),
    "B.csv": ("02:00", "02:30"),
    "C.csv": ("03:00", "03:29"),
}

for name, (start, end) in slices.items():
    mask = (df["Timestamp"].dt.strftime("%H:%M") >= start) & (df["Timestamp"].dt.strftime("%H:%M") < end)
    sub = df[mask].copy()
    sub["Timestamp"] = sub["Timestamp"].dt.strftime("%m/%d/%Y %H:%M")
    sub.to_csv(f"test_data/{name}", index=False)
    attack_ratio = (sub["Label"] != "BENIGN").mean()
    print(f"{name}: {len(sub)} rows, attack ratio: {attack_ratio:.3f}")
