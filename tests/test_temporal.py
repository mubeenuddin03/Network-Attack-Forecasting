"""
Tests for the temporal / world-model pipeline (SIH26153 ML completion).
Run from project root:  pytest  OR  python -m tests.test_temporal
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd

from src.data.create_sequences import (
    create_sequences_from_windows, add_mitre_mapping,
    build_latest_sequence, get_mitre_attack_stage, SEQUENCE_LENGTH
)
from src.models.temporal import (
    load_temporal_model, predict_trajectory, train_temporal_sklearn,
    SEQUENCE_FEATURES
)


WINDOWED = "data/processed/windowed_data.parquet"
TEMP_SEQ = "data/processed/test_sequences.parquet"
TEMP_MODEL = "models/test_temporal"


def test_sequences_created():
    df, feats, horizons = create_sequences_from_windows(WINDOWED, TEMP_SEQ)
    assert len(df) > 0, "no sequences created"
    assert len(feats) == 10
    assert horizons == [5, 10, 15, 20]
    # Multi-horizon targets present and named consistently
    for h in horizons:
        assert f'attack_prob_h{h}' in df.columns, f"missing target for horizon {h}"
    # Non-overlapping -> no two sequences share the same starting window
    starts = df['sequence_id'].tolist()
    assert len(starts) == len(set(starts)), "sequences unexpectedly overlap"
    print(f"  sequences={len(df)}, features={len(feats)}, horizons={horizons}")


def test_mitre_mapping():
    df, _, _ = create_sequences_from_windows(WINDOWED, TEMP_SEQ)
    df2 = add_mitre_mapping(df)
    valid = {'RECONNAISSANCE', 'INITIAL_ACCESS', 'COMMAND_AND_CONTROL',
             'EXFILTRATION', 'LATERAL_MOVEMENT', 'UNKNOWN'}
    assert df2['attack_stage'].isin(valid).all(), "invalid MITRE stage produced"
    print(f"  MITRE stages: {df2['attack_stage'].value_counts().to_dict()}")


def test_temporal_training_and_save():
    df, _, horizons = create_sequences_from_windows(WINDOWED, TEMP_SEQ)
    df = add_mitre_mapping(df)
    models, scaler, metrics = train_temporal_sklearn(df, SEQUENCE_FEATURES, horizons, TEMP_MODEL)
    # Artifacts saved
    import os as _os
    for f in ['model.joblib', 'scaler.joblib', 'feature_cols.json',
              'forecast_horizons.json', 'metrics.json', 'model_type.txt']:
        assert _os.path.exists(_os.path.join(TEMP_MODEL, f)), f"missing {f}"
    # Every horizon has a model entry
    for h in horizons:
        assert h in models, f"no model for horizon {h}"
    print(f"  model_type={metrics['model_type']}, horizons evaluated={list(metrics['horizons'].keys())}")


def test_fresh_inference_trajectory():
    """Fresh process: windowed data -> latest sequence -> multi-step trajectory."""
    wdf = pd.read_parquet(WINDOWED)
    seq = build_latest_sequence(wdf)
    assert seq is not None, "could not build latest sequence (need >=5 windows)"
    models, scaler, feats, horizons, _ = load_temporal_model(TEMP_MODEL)
    traj = predict_trajectory(models, scaler, feats, horizons, seq)
    assert len(traj) == len(horizons)
    for step in traj:
        assert 0.0 <= step['attack_probability'] <= 1.0
        assert 'horizon_minutes' in step and 'prediction' in step
    print("  trajectory:")
    for s in traj:
        print(f"    +{s['horizon_minutes']}min  p={s['attack_probability']:.3f}  pred={s['prediction']}  stage={seq['attack_stage']}")


def test_explainability_present():
    m = load_temporal_model(TEMP_MODEL)[4]
    expl = m.get('explainability', {})
    assert expl, "no explainability produced"
    for h, lst in expl.items():
        assert lst and 'feature' in lst[0], f"explainability empty for horizon {h}"
    print("  explainability sample (h5):",
          [(e['feature'], round(e['importance'], 4)) for e in expl.get(5, [])[:3]])


if __name__ == "__main__":
    test_sequences_created()
    test_mitre_mapping()
    test_temporal_training_and_save()
    test_fresh_inference_trajectory()
    test_explainability_present()
    print("\nALL TEMPORAL/WORLD-MODEL TESTS PASSED")
