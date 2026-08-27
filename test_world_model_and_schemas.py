"""
End-to-end verification script for World Model rollout and CSV Schema compatibility.
"""
import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from src.data.schema_detector import detect_column_mappings, standardize_dataframe
from src.models.world_model import TemporalWorldModel, STATE_FEATURES, get_world_model
from app import process_upload


def test_schema_variations():
    print("\n" + "=" * 60)
    print("TEST 1: DIVERSE CSV SCHEMA COMPATIBILITY")
    print("=" * 60)

    # 1. Renamed column schema
    df_renamed = pd.DataFrame({
        'time': ['2017-07-07 01:00:00', '2017-07-07 01:02:00', '2017-07-07 01:06:00'],
        'src_ip': ['192.168.1.10', '192.168.1.11', '192.168.1.10'],
        'dst_ip': ['10.0.0.1', '10.0.0.1', '10.0.0.2'],
        'src_port': [44321, 55432, 44322],
        'dst_port': [80, 80, 443],
        'proto': [6, 6, 6],
        'duration': [15000, 25000, 18000],
        'fwd_packets': [10, 15, 8],
        'bwd_packets': [8, 12, 6],
        'attack_type': ['BENIGN', 'BENIGN', 'BENIGN']
    })

    df_std, info = standardize_dataframe(df_renamed)
    assert 'Timestamp' in df_std.columns
    assert 'Source IP' in df_std.columns
    assert 'Total Fwd Packets' in df_std.columns
    assert 'Label' in df_std.columns
    print(f"PASS: Renamed schema mapped successfully ({info['mapped_count']} columns mapped)")

    # 2. Unlabeled schema (inference only)
    df_unlabeled = pd.DataFrame({
        'Timestamp': ['2017-07-07 01:00:00', '2017-07-07 01:02:00', '2017-07-07 01:06:00'],
        'Source IP': ['192.168.1.10', '192.168.1.11', '192.168.1.10'],
        'Destination IP': ['10.0.0.1', '10.0.0.1', '10.0.0.2'],
        'Source Port': [44321, 55432, 44322],
        'Destination Port': [80, 80, 443],
        'Protocol': [6, 6, 6],
        'Flow Duration': [15000, 25000, 18000],
        'Total Fwd Packets': [10, 15, 8],
        'Total Backward Packets': [8, 12, 6]
    })
    df_std2, info2 = standardize_dataframe(df_unlabeled)
    assert 'Label' in df_std2.columns
    assert (df_std2['Label'] == 'BENIGN').all()
    print("PASS: Unlabeled schema handled gracefully (injected placeholder benign label for inference)")

    # 3. Incompatible schema
    df_incompatible = pd.DataFrame({
        'StudentID': [1, 2, 3],
        'Grade': ['A', 'B', 'A'],
        'Score': [95, 82, 91]
    })
    try:
        standardize_dataframe(df_incompatible)
        assert False, "Incompatible schema should raise ValueError"
    except ValueError as e:
        print(f"PASS: Incompatible schema correctly rejected with diagnostic error: {str(e)[:60]}...")


def test_world_model_rollout():
    print("\n" + "=" * 60)
    print("TEST 2: TEMPORAL WORLD MODEL AUTOREGRESSIVE K-STEP ROLLOUT")
    print("=" * 60)

    wm = get_world_model()
    assert wm is not None, "World model should load successfully"
    assert wm.is_fitted, "World model should be fitted"

    sample_state = {col: 50.0 for col in STATE_FEATURES}
    sample_state['total_flows'] = 2500.0
    sample_state['syn_count'] = 1800.0
    sample_state['unique_source_ports'] = 1200.0
    sample_state['unique_dest_ports'] = 1400.0

    # 4-step rollout (T+0, T+5m, T+10m, T+15m, T+20m)
    rollout = wm.rollout(sample_state, k_steps=4, window_minutes=5)
    assert len(rollout) == 5, f"Expected 5 rollout horizons, got {len(rollout)}"

    print("PASS: World Model Forward Simulation Trajectory:")
    for h in rollout:
        prob = h['probability'] * 100
        low = h['lowerBound'] * 100
        high = h['upperBound'] * 100
        print(f"  {h['stepLabel']}: Risk={prob:.1f}% [{low:.1f}% - {high:.1f}%] -> {h['projectedStage']}")


def test_process_upload_friday():
    print("\n" + "=" * 60)
    print("TEST 3: FULL PIPELINE CSV UPLOAD WITH WORLD MODEL INFERENCE")
    print("=" * 60)

    friday_csv = "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv"
    if Path(friday_csv).exists():
        res = process_upload(friday_csv, "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv", os.path.getsize(friday_csv))
        assert "prediction" in res
        assert "horizons" in res["prediction"]
        assert len(res["prediction"]["horizons"]) == 5
        print(f"PASS: Ingested {res['dataset']['row_count']} rows -> Created {res['dataset']['window_count']} temporal windows")
        print(f"PASS: Latest Infiltration Probability = {res['prediction']['attack_probability']*100:.1f}%")
        print(f"PASS: 4-Step Rollout Horizons generated ({len(res['prediction']['horizons'])} steps)")
    else:
        print("SKIP: Friday CSV not found in workspace root")


if __name__ == '__main__':
    test_schema_variations()
    test_world_model_rollout()
    test_process_upload_friday()
    print("\n" + "=" * 60)
    print("ALL WORLD MODEL & SCHEMA COMPATIBILITY TESTS PASSED!")
    print("=" * 60)
