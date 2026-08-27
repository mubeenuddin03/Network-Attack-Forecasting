"""
Train ML models for temporal attack forecasting.
Compares Logistic Regression, Random Forest, and HistGradientBoosting.
Selects best model based on validation F1, optimizes threshold.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (precision_score, recall_score, f1_score,
                             average_precision_score, confusion_matrix,
                             roc_auc_score)
import joblib
import json


def prepare_features(df: pd.DataFrame):
    """Select and prepare numerical features for modeling."""
    exclude_cols = ['window_start', 'window_end', 'window_attack_count',
                    'window_attack_ratio', 'window_dominant_label',
                    'future_attack', 'future_attack_ratio', 'future_dominant_label',
                    'window_has_attack']

    feature_cols = [c for c in df.columns if c not in exclude_cols]
    X = df[feature_cols].copy()
    y = df['future_attack'].copy()

    X = X.replace([np.inf, -np.inf], np.nan)
    X = X.fillna(X.median())

    print(f"  Features: {len(feature_cols)}")
    return X, y, feature_cols


def chronological_split(X, y, train_ratio=0.6, val_ratio=0.2):
    """Split chronologically: train -> val -> test."""
    n = len(X)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
    X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
    X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]

    print(f"  Train: {len(X_train)} samples ({y_train.sum()} positive)")
    print(f"  Val:   {len(X_val)} samples ({y_val.sum()} positive)")
    print(f"  Test:  {len(X_test)} samples ({y_test.sum()} positive)")
    print(f"  Train class dist: {y_train.value_counts().to_dict()}")
    print(f"  Val class dist:   {y_val.value_counts().to_dict()}")
    print(f"  Test class dist:  {y_test.value_counts().to_dict()}")

    return X_train, X_val, X_test, y_train, y_val, y_test


def compute_metrics(y_true, y_pred, y_proba):
    """Compute all evaluation metrics."""
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    pr_auc = average_precision_score(y_true, y_proba) if len(set(y_true)) > 1 else 0.0
    roc_auc = roc_auc_score(y_true, y_proba) if len(set(y_true)) > 1 else 0.0
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    return {
        'precision': float(precision),
        'recall': float(recall),
        'f1': float(f1),
        'pr_auc': float(pr_auc),
        'roc_auc': float(roc_auc),
        'fpr': float(fpr),
        'confusion_matrix': cm.tolist(),
        'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)
    }


def print_metrics(name, metrics):
    """Print metrics formatted."""
    m = metrics
    print(f"\n  {name}:")
    print(f"    Precision: {m['precision']:.4f}")
    print(f"    Recall:    {m['recall']:.4f}")
    print(f"    F1:        {m['f1']:.4f}")
    print(f"    PR-AUC:    {m['pr_auc']:.4f}")
    print(f"    ROC-AUC:   {m['roc_auc']:.4f}")
    print(f"    FPR:       {m['fpr']:.4f}")
    print(f"    CM:        TN={m['tn']} FP={m['fp']} FN={m['fn']} TP={m['tp']}")


def optimize_threshold(y_true, y_proba):
    """Find optimal threshold using F1 on validation data."""
    best_f1 = 0
    best_thr = 0.5
    results = []

    for thr in np.arange(0.1, 0.95, 0.05):
        pred = (y_proba >= thr).astype(int)
        f1 = f1_score(y_true, pred, zero_division=0)
        p = precision_score(y_true, pred, zero_division=0)
        r = recall_score(y_true, pred, zero_division=0)
        results.append({'threshold': float(thr), 'precision': float(p), 'recall': float(r), 'f1': float(f1)})
        if f1 > best_f1:
            best_f1 = f1
            best_thr = thr

    print(f"\n  Threshold optimization:")
    for r in results:
        marker = " <-- BEST" if r['threshold'] == best_thr else ""
        print(f"    thr={r['threshold']:.2f}: P={r['precision']:.3f} R={r['recall']:.3f} F1={r['f1']:.3f}{marker}")

    return float(best_thr), results


def get_feature_importance(model, feature_cols, model_type):
    """Extract feature importance from the model."""
    if model_type == 'RandomForest':
        importance = model.feature_importances_
    elif model_type == 'LogisticRegression':
        importance = np.abs(model.coef_[0])
    elif model_type == 'HistGradientBoosting':
        importance = np.abs(model.feature_importances_)
    else:
        return {}

    importance_dict = dict(zip(feature_cols, importance.tolist()))
    sorted_imp = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
    return sorted_imp


def train_models(X_train, y_train, X_val, y_val):
    """Train multiple models and return comparison results."""
    results = {}

    # Scale features for Logistic Regression
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    # Models to compare
    models = {
        'LogisticRegression': LogisticRegression(
            class_weight='balanced', max_iter=1000, random_state=42
        ),
        'RandomForest': RandomForestClassifier(
            n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1
        ),
        'HistGradientBoosting': HistGradientBoostingClassifier(
            max_iter=100, random_state=42
        ),
    }

    for name, model in models.items():
        print(f"\n  Training {name}...")

        # Use scaled data for LogReg
        if name == 'LogisticRegression':
            model.fit(X_train_scaled, y_train)
            val_proba = model.predict_proba(X_val_scaled)[:, 1]
        else:
            model.fit(X_train.values, y_train)
            val_proba = model.predict_proba(X_val.values)[:, 1]

        # Default threshold 0.5
        val_pred = (val_proba >= 0.5).astype(int)
        metrics = compute_metrics(y_val.values, val_pred, val_proba)

        print_metrics(f"{name} (thr=0.5)", metrics)
        results[name] = {
            'model': model,
            'scaler': scaler if name == 'LogisticRegression' else None,
            'needs_scaling': name == 'LogisticRegression',
            'val_metrics': metrics,
            'val_proba': val_proba,
        }

    return results


def select_best_model(results, y_val):
    """Select best model based on validation F1."""
    best_name = max(results, key=lambda k: results[k]['val_metrics']['f1'])
    print(f"\n  Best model by F1: {best_name}")
    return best_name, results[best_name]


def save_model(model, scaler, feature_cols, metrics, output_dir):
    """Save model, scaler, and metadata."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    joblib.dump(model, Path(output_dir) / 'model.joblib')
    if scaler is not None:
        joblib.dump(scaler, Path(output_dir) / 'scaler.joblib')

    with open(Path(output_dir) / 'feature_cols.json', 'w') as f:
        json.dump(feature_cols, f)

    with open(Path(output_dir) / 'metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    print(f"\n  Saved model to {output_dir}")


def train_forecasting_model(input_path: str, model_dir: str):
    """Full training pipeline with model comparison and threshold optimization."""
    print("=" * 60)
    print("NETWORK ATTACK FORECASTING — ML TRAINING PIPELINE")
    print("=" * 60)
    print(f"\nLoading windowed data: {input_path}")
    df = pd.read_parquet(input_path)
    print(f"  Loaded shape: {df.shape}")

    X, y, feature_cols = prepare_features(df)
    X_train, X_val, X_test, y_train, y_val, y_test = chronological_split(X, y)

    print("\n" + "=" * 60)
    print("MODEL COMPARISON")
    print("=" * 60)
    results = train_models(X_train, y_train, X_val, y_val)

    # Select best model
    best_name, best_result = select_best_model(results, y_val)
    model = best_result['model']
    scaler = best_result['scaler']

    # Optimize threshold on validation data
    print("\n" + "=" * 60)
    print("THRESHOLD OPTIMIZATION")
    print("=" * 60)
    best_thr, thr_results = optimize_threshold(y_val.values, best_result['val_proba'])

    # Evaluate on test set with optimal threshold
    print("\n" + "=" * 60)
    print("FINAL EVALUATION ON TEST SET")
    print("=" * 60)

    if best_result['needs_scaling']:
        X_test_scaled = scaler.transform(X_test)
        test_proba = model.predict_proba(X_test_scaled)[:, 1]
    else:
        test_proba = model.predict_proba(X_test.values)[:, 1]

    test_pred = (test_proba >= best_thr).astype(int)
    test_metrics = compute_metrics(y_test.values, test_pred, test_proba)

    # Also compute with default threshold for comparison
    test_pred_05 = (test_proba >= 0.5).astype(int)
    test_metrics_05 = compute_metrics(y_test.values, test_pred_05, test_proba)

    print_metrics("Test (optimal threshold)", test_metrics)
    print_metrics("Test (default 0.5)", test_metrics_05)

    # Feature importance
    print("\n" + "=" * 60)
    print("TOP 10 IMPORTANT FEATURES")
    print("=" * 60)
    importance = get_feature_importance(model, feature_cols, best_name)
    for i, (feat, imp) in enumerate(list(importance.items())[:10]):
        print(f"  {i+1}. {feat}: {imp:.4f}")

    # Save all results
    all_metrics = {
        'best_model': best_name,
        'threshold': best_thr,
        'validation': best_result['val_metrics'],
        'test': test_metrics,
        'test_at_05': test_metrics_05,
        'threshold_sweep': thr_results,
        'feature_importance': importance,
        'feature_cols': feature_cols,
        'n_features': len(feature_cols),
        'model_type': best_name,
        'needs_scaling': best_result['needs_scaling']
    }

    save_model(model, scaler, feature_cols, all_metrics, model_dir)

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"  Best Model: {best_name}")
    print(f"  Threshold: {best_thr:.2f}")
    print(f"  Test F1: {test_metrics['f1']:.4f}")
    print(f"  Test Recall: {test_metrics['recall']:.4f}")
    print(f"  Test Precision: {test_metrics['precision']:.4f}")

    # Also train and save Temporal World Model
    try:
        train_world_model_from_windows(df, "models/world_model")
    except Exception as e:
        print(f"World model training skipped: {e}")

    return model, scaler, feature_cols, all_metrics


def train_world_model_from_windows(df: pd.DataFrame, output_dir: str = "models/world_model"):
    """Train the Temporal World Model P(S_{t+1}|S_t) on consecutive temporal windows."""
    from src.models.world_model import TemporalWorldModel, STATE_FEATURES
    print("\n" + "=" * 60)
    print("TRAINING TEMPORAL WORLD MODEL (STATE TRANSITION DYNAMICS)")
    print("=" * 60)

    df_sorted = df.sort_values('window_start').reset_index(drop=True)
    feature_cols = [c for c in STATE_FEATURES if c in df_sorted.columns]

    X_current = df_sorted.iloc[:-1][feature_cols]
    X_next = df_sorted.iloc[1:][feature_cols]
    y_next = df_sorted.iloc[1:]['window_has_attack'] if 'window_has_attack' in df_sorted.columns else df_sorted.iloc[:-1]['future_attack']

    wm = TemporalWorldModel(feature_names=feature_cols)
    metrics = wm.fit(X_current, X_next, y_next)

    print(f"  State Dimension: {metrics['state_dimension']}")
    print(f"  State Transition R2: {metrics['state_transition_r2']:.4f}")
    print(f"  Next-Step Forecast F1: {metrics['next_step_f1']:.4f}")
    print(f"  Next-Step Forecast Precision: {metrics['next_step_precision']:.4f}")
    print(f"  Next-Step Forecast Recall: {metrics['next_step_recall']:.4f}")

    wm.save(Path(output_dir))
    return wm


if __name__ == "__main__":
    input_file = "data/processed/windowed_data.parquet"
    model_dir = "models/baseline"
    train_forecasting_model(input_file, model_dir)

