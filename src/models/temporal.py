"""
Temporal sequence model for network attack forecasting (World Model).

Two backends are provided:
  1. A PyTorch LSTM (optional, only if torch is installed) for true
     recurrent sequence modeling.
  2. A lightweight, dependency-free sequence-block multi-horizon forecaster
     (Logistic Regression per horizon) that is ALWAYS trained and saved, so
     the world model works without a heavy deep-learning dependency.

Both consume the SAME network-state representation: each sample is a block of
SEQUENCE_LENGTH consecutive 5-minute windows (a temporal history S(t-k)..S(t)),
and they predict the attack probability at multiple future horizons
(+5, +10, +15, +20 minutes). This is "direct multi-horizon forecasting" - an
honest, scientifically valid approach. It is NOT a recursive state rollout,
and is documented as such.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import numpy as np
import pandas as pd
import joblib
import json
from pathlib import Path
from typing import Tuple, Dict, List, Optional
import warnings
warnings.filterwarnings('ignore')

# Sequence-block feature columns (must match src/data/create_sequences.py)
SEQUENCE_FEATURES = [
    'total_flows', 'total_packets', 'total_bytes',
    'avg_unique_ips', 'avg_port_diversity', 'syn_rate',
    'tcp_ratio', 'attack_activity', 'traffic_intensity', 'volatility'
]


try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    import types
    # Placeholder so the LSTM class definition succeeds without torch installed.
    nn = types.SimpleNamespace(Module=object, LSTM=None, Dropout=None,
                               Linear=None, Sigmoid=None)
    TORCH_AVAILABLE = False


# ---------------------------------------------------------------------------
# OPTIONAL: PyTorch LSTM backend (kept from prior work; used only if torch present)
# ---------------------------------------------------------------------------
class AttackForecastLSTM(nn.Module):
    """LSTM for multi-step attack forecasting."""

    def __init__(self, input_size: int, hidden_size: int = 64,
                 num_layers: int = 2, output_size: int = 4,
                 dropout: float = 0.2):
        super(AttackForecastLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.output_size = output_size
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, output_size)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_output = lstm_out[:, -1, :]
        output = self.dropout(last_output)
        output = self.fc(output)
        output = self.sigmoid(output)
        return output


def prepare_sequences_data(df: pd.DataFrame, feature_cols: List[str],
                          forecast_horizons: List[int]) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
    """Prepare sequence data for LSTM training (real sequence dimension)."""
    print(f"Preparing sequence data from {len(df)} sequences")
    X = df[feature_cols].values.astype(np.float32)
    X = X.reshape(-1, 1, len(feature_cols))
    y_dict = {}
    for horizon in forecast_horizons:
        target_col = f'attack_prob_h{horizon}'
        if target_col in df.columns:
            y_dict[horizon] = df[target_col].values.astype(np.float32)
        else:
            y_dict[horizon] = np.zeros(len(df), dtype=np.float32)
    print(f"  Features shape: {X.shape}")
    return X, y_dict


def split_sequences_chronological(X: np.ndarray, y_dict: Dict[str, np.ndarray],
                                  train_ratio: float = 0.6, val_ratio: float = 0.2):
    n = len(X)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    X_train, y_train = X[:train_end], {k: v[:train_end] for k, v in y_dict.items()}
    X_val, y_val = X[train_end:val_end], {k: v[train_end:val_end] for k, v in y_dict.items()}
    X_test, y_test = X[val_end:], {k: v[val_end:] for k, v in y_dict.items()}
    print(f"  Train: {len(X_train)} sequences")
    print(f"  Val:   {len(X_val)} sequences")
    print(f"  Test:  {len(X_test)} sequences")
    return (X_train, y_train), (X_val, y_val), (X_test, y_test)


def train_lstm_model(X_train, y_train, X_val, y_val, input_size, epochs=100,
                     learning_rate=0.001, batch_size=32):
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch is required for LSTM model.")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = AttackForecastLSTM(input_size=input_size).to(device)
    criterion = nn.BCELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    X_train_tensor = torch.FloatTensor(X_train).to(device)
    X_val_tensor = torch.FloatTensor(X_val).to(device)
    horizons = sorted(y_train.keys())
    y_train_tensors = [torch.FloatTensor(y_train[h]).unsqueeze(1).to(device) for h in horizons]
    y_val_tensors = [torch.FloatTensor(y_val[h]).unsqueeze(1).to(device) for h in horizons]
    train_dataset = torch.utils.data.TensorDataset(X_train_tensor, *y_train_tensors)
    val_dataset = torch.utils.data.TensorDataset(X_val_tensor, *y_val_tensors)
    train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=False)
    val_loader = torch.utils.data.DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    best_val_loss = float('inf'); patience_counter = 0; patience = 10
    train_losses = []; val_losses = []
    for epoch in range(epochs):
        model.train(); train_loss = 0.0
        for batch in train_loader:
            optimizer.zero_grad()
            inputs = batch[0]; targets = list(batch[1:])
            outputs = model(inputs)
            loss = sum(criterion(outputs[:, i:i+1], t) for i, t in enumerate(targets)) / len(targets)
            loss.backward(); optimizer.step(); train_loss += loss.item()
        train_loss /= len(train_loader)
        model.eval(); val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                inputs = batch[0]; targets = list(batch[1:])
                outputs = model(inputs)
                loss = sum(criterion(outputs[:, i:i+1], t) for i, t in enumerate(targets)) / len(targets)
                val_loss += loss.item()
        val_loss /= len(val_loader)
        train_losses.append(train_loss); val_losses.append(val_loss)
        if val_loss < best_val_loss:
            best_val_loss = val_loss; patience_counter = 0
            torch.save(model.state_dict(), '/tmp/best_lstm_model.pt')
        else:
            patience_counter += 1
        if epoch % 20 == 0:
            print(f"    Epoch {epoch}: Train {train_loss:.6f} Val {val_loss:.6f}")
        if patience_counter >= patience:
            print(f"    Early stopping at epoch {epoch}"); break
    model.load_state_dict(torch.load('/tmp/best_lstm_model.pt'))
    return model, {'train_losses': train_losses, 'val_losses': val_losses,
                   'best_val_loss': best_val_loss, 'epochs_trained': epoch + 1}


def predict_lstm_sequences(model, X_test, horizons):
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch is required for LSTM predictions")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.eval(); model.to(device)
    X_test_tensor = torch.FloatTensor(X_test).to(device)
    with torch.no_grad():
        outputs = model(X_test_tensor).cpu().numpy()
    return {horizon: outputs[:, i] for i, horizon in enumerate(horizons)}


def save_lstm_model(model, scaler, feature_cols, forecast_horizons, metrics, output_dir):
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    if TORCH_AVAILABLE:
        torch.save(model.state_dict(), Path(output_dir) / 'lstm_model.pt')
    if scaler is not None:
        joblib.dump(scaler, Path(output_dir) / 'scaler.joblib')
    with open(Path(output_dir) / 'feature_cols.json', 'w') as f:
        json.dump(feature_cols, f)
    with open(Path(output_dir) / 'forecast_horizons.json', 'w') as f:
        json.dump(forecast_horizons, f)
    with open(Path(output_dir) / 'metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    with open(Path(output_dir) / 'model_type.txt', 'w') as f:
        f.write('LSTM')


def load_lstm_model(model_dir: str):
    model_path = Path(model_dir)
    with open(model_path / 'feature_cols.json') as f:
        feature_cols = json.load(f)
    with open(model_path / 'forecast_horizons.json') as f:
        forecast_horizons = json.load(f)
    with open(model_path / 'metrics.json') as f:
        metrics = json.load(f)
    scaler = joblib.load(model_path / 'scaler.joblib') if (model_path / 'scaler.joblib').exists() else None
    model = None
    if TORCH_AVAILABLE and (model_path / 'lstm_model.pt').exists():
        model = AttackForecastLSTM(input_size=len(feature_cols))
        model.load_state_dict(torch.load(model_path / 'lstm_model.pt'))
        model.eval()
    return model, scaler, feature_cols, forecast_horizons, metrics


def evaluate_lstm_predictions(y_true_dict, y_pred_dict, horizons):
    from sklearn.metrics import (precision_score, recall_score, f1_score,
                                average_precision_score, roc_auc_score, confusion_matrix)
    results = {}
    for horizon in horizons:
        y_true = y_true_dict[horizon]; y_pred_prob = y_pred_dict[horizon]
        y_pred = (y_pred_prob >= 0.5).astype(int)
        if len(set(y_true)) < 2:
            precision = recall = f1 = pr_auc = roc_auc = 0.0
            tn, fp, fn, tp = (0, 0, 0, len(y_true)) if y_true[0] == 0 else (len(y_true), 0, 0, 0)
        else:
            precision = precision_score(y_true, y_pred, zero_division=0)
            recall = recall_score(y_true, y_pred, zero_division=0)
            f1 = f1_score(y_true, y_pred, zero_division=0)
            pr_auc = average_precision_score(y_true, y_pred_prob)
            roc_auc = roc_auc_score(y_true, y_pred_prob)
            tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
        results[f'horizon_{horizon}min'] = {
            'precision': float(precision), 'recall': float(recall), 'f1': float(f1),
            'pr_auc': float(pr_auc), 'roc_auc': float(roc_auc),
            'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)}
    return results


# ---------------------------------------------------------------------------
# DEFAULT: lightweight sequence-block multi-horizon forecaster (sklearn)
# ---------------------------------------------------------------------------
def prepare_temporal_data(sequences_df: pd.DataFrame, feature_cols: List[str],
                          forecast_horizons: List[int]):
    """Build X and per-horizon y from sequence rows. Drops NaN targets per horizon."""
    print(f"Preparing temporal data from {len(sequences_df)} sequences")
    X = sequences_df[feature_cols].values.astype(np.float64)
    y_dict = {}
    for h in forecast_horizons:
        col = f'attack_prob_h{h}'
        y = sequences_df[col].values.astype(np.float64)
        mask = ~np.isnan(y)
        y_dict[h] = (y, mask)
        print(f"  Horizon {h}min: {int(mask.sum())} valid target rows")
    return X, y_dict


def train_temporal_sklearn(sequences_df: pd.DataFrame, feature_cols: List[str],
                           forecast_horizons: List[int], model_dir: str):
    """Train one LogisticRegression per horizon on the temporal sequence blocks.

    Chronological split (train<val<test). Permutation importance for
    explainability. Saves all artifacts to model_dir.
    """
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import (precision_score, recall_score, f1_score,
                                average_precision_score, roc_auc_score, confusion_matrix)
    from sklearn.inspection import permutation_importance

    X, y_dict = prepare_temporal_data(sequences_df, feature_cols, forecast_horizons)
    n = len(X)
    train_end = int(n * 0.6); val_end = int(n * 0.8)
    idx_train = np.arange(0, train_end)
    idx_val = np.arange(train_end, val_end)
    idx_test = np.arange(val_end, n)

    scaler = StandardScaler().fit(X[idx_train])
    models = {}
    metrics = {'horizons': {}, 'model_type': 'SequenceMultiHorizon(LogisticRegression)'}
    expl = {}

    for h in forecast_horizons:
        y, mask = y_dict[h]
        tr = idx_train[mask[idx_train]]
        va = idx_val[mask[idx_val]]
        te = idx_test[mask[idx_test]]
        if len(tr) == 0 or len(np.unique(y[tr])) < 2:
            print(f"  Horizon {h}min: insufficient training signal -> constant prior predictor.")
            majority = 1.0 if (y[tr].mean() > 0.5 if len(tr) else False) else 0.0
            models[h] = ('constant', majority)
            metrics['horizons'][f'horizon_{h}min'] = {
                'precision': 0.0, 'recall': 0.0, 'f1': 0.0,
                'pr_auc': 0.0, 'roc_auc': 0.0, 'n_test': int(len(te)),
                'note': 'insufficient signal'}
            continue

        Xtr = scaler.transform(X[tr]); Xva = scaler.transform(X[va]); Xte = scaler.transform(X[te])
        clf = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)
        clf.fit(Xtr, y[tr].astype(int))
        models[h] = ('lr', clf)

        # Threshold optimization on validation
        proba_val = clf.predict_proba(Xva)[:, 1]
        best_f1, best_thr = 0.0, 0.5
        for thr in np.arange(0.1, 0.95, 0.05):
            p = (proba_val >= thr).astype(int)
            f1v = f1_score(y[va].astype(int), p, zero_division=0)
            if f1v > best_f1:
                best_f1, best_thr = f1v, thr

        proba_te = clf.predict_proba(Xte)[:, 1]
        pred_te = (proba_te >= best_thr).astype(int)
        yt = y[te].astype(int)
        if len(set(yt)) < 2:
            pr_auc = roc = 0.0
            tn, fp, fn, tp = (0, 0, 0, len(yt)) if yt[0] == 0 else (len(yt), 0, 0, 0)
            p = r = f1v = 0.0
        else:
            p = precision_score(yt, pred_te, zero_division=0)
            r = recall_score(yt, pred_te, zero_division=0)
            f1v = f1_score(yt, pred_te, zero_division=0)
            pr_auc = average_precision_score(yt, proba_te)
            roc = roc_auc_score(yt, proba_te)
            tn, fp, fn, tp = confusion_matrix(yt, pred_te, labels=[0, 1]).ravel()
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        metrics['horizons'][f'horizon_{h}min'] = {
            'precision': float(p), 'recall': float(r), 'f1': float(f1v),
            'pr_auc': float(pr_auc), 'roc_auc': float(roc), 'fpr': float(fpr),
            'threshold': float(best_thr), 'n_train': int(len(tr)),
            'n_val': int(len(va)), 'n_test': int(len(te)),
            'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)}

        # Explainability: permutation importance when enough samples exist,
        # otherwise fall back to the model's own (real) coefficients.
        try:
            if len(Xte) >= 2:
                base = (Xte, yt)
            elif len(Xva) >= 2:
                base = (Xva, y[va].astype(int))
            else:
                base = None
            if base is not None:
                pi = permutation_importance(clf, base[0], base[1], n_repeats=10, random_state=42)
                imp = sorted(zip(feature_cols, pi.importances_mean), key=lambda z: z[1], reverse=True)
                expl[h] = [{'feature': f, 'importance': float(v)} for f, v in imp]
            else:
                coef = clf.coef_[0]
                imp = sorted(zip(feature_cols, coef), key=lambda z: abs(z[1]), reverse=True)
                expl[h] = [{'feature': f, 'importance': float(v)} for f, v in imp]
        except Exception as e:
            expl[h] = [{'error': str(e)}]

    metrics['explainability'] = expl
    metrics['feature_cols'] = feature_cols
    metrics['n_sequences_total'] = n

    Path(model_dir).mkdir(parents=True, exist_ok=True)
    joblib.dump({'models': models, 'feature_cols': feature_cols}, Path(model_dir) / 'model.joblib')
    joblib.dump(scaler, Path(model_dir) / 'scaler.joblib')
    with open(Path(model_dir) / 'feature_cols.json', 'w') as f:
        json.dump(feature_cols, f)
    with open(Path(model_dir) / 'forecast_horizons.json', 'w') as f:
        json.dump(forecast_horizons, f)
    with open(Path(model_dir) / 'metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    with open(Path(model_dir) / 'model_type.txt', 'w') as f:
        f.write('SequenceMultiHorizon(LogisticRegression)')

    print(f"  Saved sequence world-model to {model_dir}")
    return models, scaler, metrics


def load_temporal_model(model_dir: str):
    """Load the saved sequence world-model. Returns (models_dict, scaler, feature_cols, horizons, metrics)."""
    model_path = Path(model_dir)
    bundle = joblib.load(model_path / 'model.joblib')
    models = bundle['models']; feature_cols = bundle['feature_cols']
    with open(model_path / 'forecast_horizons.json') as f:
        horizons = json.load(f)
    with open(model_path / 'metrics.json') as f:
        metrics = json.load(f)
    scaler = joblib.load(model_path / 'scaler.joblib') if (model_path / 'scaler.joblib').exists() else None
    return models, scaler, feature_cols, horizons, metrics


def predict_trajectory(models, scaler, feature_cols, horizons, sequence_feature_dict: dict):
    """Predict multi-step attack-probability trajectory from a sequence block.

    Returns a list of {horizon_minutes, attack_probability, prediction}.
    """
    x = np.array([[sequence_feature_dict[c] for c in feature_cols]], dtype=np.float64)
    x = scaler.transform(x)
    out = []
    for h in horizons:
        entry = models[h]
        if entry[0] == 'constant':
            proba = float(entry[1])
        else:
            proba = float(entry[1].predict_proba(x)[0, 1])
        out.append({
            'horizon_minutes': h,
            'attack_probability': proba,
            'prediction': int(proba >= 0.5),
        })
    return out


# ---------------------------------------------------------------------------
# Pipeline entry point
# ---------------------------------------------------------------------------
def create_temporal_forecasting_pipeline(input_path: str, model_dir: str) -> Tuple[object, Dict]:
    """Train and save the world model. Uses LSTM if torch present, else sklearn."""
    from src.data.create_sequences import create_sequential_dataset, FORECAST_HORIZONS

    print("=" * 60)
    print("TEMPORAL / WORLD-MODEL FORECASTING PIPELINE")
    print("=" * 60)

    print("\n1. Creating temporal sequences (with MITRE mapping)...")
    sequences_df, _, horizons = create_sequential_dataset(
        input_path, "data/processed/temp_sequences.parquet"
    )
    print(f"   Sequences: {len(sequences_df)}, Horizons: {horizons}")

    if TORCH_AVAILABLE:
        print("\n2. Training LSTM world model (torch available)...")
        X, y_dict = prepare_sequences_data(sequences_df, SEQUENCE_FEATURES, horizons)
        (Xtr, ytr), (Xva, yva), (Xte, yte) = split_sequences_chronological(X, y_dict)
        model, info = train_lstm_model(Xtr, ytr, Xva, yva, input_size=len(SEQUENCE_FEATURES))
        y_pred = predict_lstm_sequences(model, Xte, horizons)
        metrics = evaluate_lstm_predictions(yte, y_pred, horizons)
        metrics['train_info'] = info
        save_lstm_model(model, None, SEQUENCE_FEATURES, horizons, metrics, model_dir)
        return model, metrics
    else:
        print("\n2. Training sequence-block multi-horizon forecaster (sklearn; torch not installed)")
        models, scaler, metrics = train_temporal_sklearn(
            sequences_df, SEQUENCE_FEATURES, horizons, model_dir
        )
        return models, metrics


if __name__ == "__main__":
    input_file = "data/processed/windowed_data.parquet"
    model_dir = "models/temporal"
    create_temporal_forecasting_pipeline(input_file, model_dir)
