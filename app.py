"""
FastAPI backend for Network Attack Forecasting.
Supports the trained baseline model and CIC-IDS2017 CSV upload.
"""
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import Literal

MODEL_DIR = Path("models/baseline")
FEATURE_COLS_PATH = MODEL_DIR / "feature_cols.json"
MODEL_PATH = MODEL_DIR / "model.joblib"
SCALER_PATH = MODEL_DIR / "scaler.joblib"
METRICS_PATH = MODEL_DIR / "metrics.json"
MAX_CSV_BYTES = 300 * 1024 * 1024

_model = None
_scaler = None
_feature_cols = None
_model_loaded = False
_model_load_error = None


class WindowFeatures(BaseModel):
    total_flows: float = Field(..., ge=0)
    total_packets: float = Field(..., ge=0)
    total_bytes: float = Field(..., ge=0)
    unique_source_ips: float = Field(..., ge=0)
    unique_dest_ips: float = Field(..., ge=0)
    unique_source_ports: float = Field(..., ge=0)
    unique_dest_ports: float = Field(..., ge=0)
    tcp_flow_count: float = Field(..., ge=0)
    udp_flow_count: float = Field(..., ge=0)
    syn_count: float = Field(..., ge=0)
    ack_count: float = Field(..., ge=0)
    rst_count: float = Field(..., ge=0)
    fin_count: float = Field(..., ge=0)
    psh_count: float = Field(..., ge=0)
    urg_count: float = Field(..., ge=0)
    avg_flow_duration: float
    max_flow_duration: float
    std_flow_duration: float
    avg_packet_size: float
    max_packet_size: float
    min_packet_size: float
    std_packet_size: float
    avg_flow_bytes_per_sec: float
    avg_flow_packets_per_sec: float
    avg_fwd_packets: float
    avg_bwd_packets: float
    avg_fwd_bytes: float
    avg_bwd_bytes: float
    avg_flow_iat_mean: float
    avg_fwd_iat_mean: float
    avg_bwd_iat_mean: float
    avg_active_mean: float
    avg_idle_mean: float
    avg_subflow_fwd_pkts: float
    avg_subflow_bwd_pkts: float

    @validator('*', pre=True)
    def replace_nan_inf(cls, v):
        if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
            return 0.0
        return v


class PredictRequest(BaseModel):
    features: WindowFeatures
    threshold: Optional[float] = Field(0.5, ge=0.0, le=1.0)


class PredictResponse(BaseModel):
    attack_probability: float = Field(..., ge=0.0, le=1.0)
    prediction: int = Field(..., ge=0, le=1)
    status: Literal["ATTACK_LIKELY", "NORMAL"]
    mode: Literal["REAL_MODEL", "DEMO"]
    threshold_used: float


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded"]
    model_loaded: bool
    model_mode: Literal["REAL_MODEL", "DEMO"]
    model_info: Optional[dict] = None


class RootResponse(BaseModel):
    message: str
    version: str
    endpoints: dict


def load_model_artifacts():
    global _model, _scaler, _feature_cols, _model_loaded, _model_load_error
    try:
        if not MODEL_PATH.exists() or not SCALER_PATH.exists() or not FEATURE_COLS_PATH.exists():
            raise FileNotFoundError(f"Model artifacts not found in {MODEL_DIR}")
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        with open(FEATURE_COLS_PATH) as f:
            _feature_cols = json.load(f)
        _model_loaded = True
        _model_load_error = None
        print(f"Loaded real model from {MODEL_DIR} ({len(_feature_cols)} features)")
    except Exception as e:
        _model_load_error = str(e)
        _model_loaded = False
        print(f"Failed to load real model: {e}")


def get_model_info() -> Optional[dict]:
    if not METRICS_PATH.exists():
        return None
    try:
        with open(METRICS_PATH) as f:
            return json.load(f)
    except Exception:
        return None


def predict_real_model(features: WindowFeatures, threshold: float) -> tuple:
    if not _model_loaded:
        raise RuntimeError("Real model not loaded")
    X = pd.DataFrame([features.dict()])[_feature_cols]
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    X_scaled = _scaler.transform(X)
    proba = float(_model.predict_proba(X_scaled)[:, 1][0])
    return proba, int(proba >= threshold)


def predict_demo_mode(features: WindowFeatures, threshold: float) -> tuple:
    syn_rate = features.syn_count / max(features.total_flows, 1)
    port_diversity = (features.unique_source_ports + features.unique_dest_ports) / max(features.total_flows, 1)
    flow_intensity = features.total_flows / 1000.0
    score = min(1.0, (syn_rate * 2.0) + (port_diversity * 1.5) + (flow_intensity * 0.5))
    return float(np.clip(score, 0, 1)), int(score >= threshold)


def extract_latest_window_from_csv(path: str) -> tuple[dict, int, int]:
    """Process a CIC-IDS2017 flow CSV and return the latest 5-minute model window."""
    required = [
        'Timestamp', 'Total Fwd Packets', 'Total Backward Packets',
        'Total Length of Fwd Packets', 'Total Length of Bwd Packets',
        'Source IP', 'Destination IP', 'Source Port', 'Destination Port',
        'Protocol', 'SYN Flag Count', 'ACK Flag Count', 'RST Flag Count',
        'FIN Flag Count', 'PSH Flag Count', 'URG Flag Count', 'Flow Duration',
        'Average Packet Size', 'Max Packet Length', 'Min Packet Length',
        'Packet Length Std', 'Flow Bytes/s', 'Flow Packets/s',
        'Total Fwd Packets', 'Total Backward Packets', 'Flow IAT Mean',
        'Fwd IAT Mean', 'Bwd IAT Mean', 'Active Mean', 'Idle Mean',
        'Subflow Fwd Packets', 'Subflow Bwd Packets'
    ]
    chunks = []
    rows = 0
    for chunk in pd.read_csv(path, chunksize=50000, low_memory=False):
        chunk.columns = chunk.columns.str.strip()
        missing = [c for c in required if c not in chunk.columns]
        if missing:
            raise ValueError('Unsupported CSV. Missing columns: ' + ', '.join(missing[:8]))
        chunk['Timestamp'] = pd.to_datetime(chunk['Timestamp'], errors='coerce')
        chunk = chunk.dropna(subset=['Timestamp'])
        numeric = [c for c in required if c not in {'Timestamp', 'Source IP', 'Destination IP'}]
        for c in numeric:
            chunk[c] = pd.to_numeric(chunk[c], errors='coerce').replace([np.inf, -np.inf], np.nan).fillna(0)
        chunk['window_start'] = chunk['Timestamp'].dt.floor('5min')
        chunks.append(chunk)
        rows += len(chunk)

    if not chunks:
        raise ValueError('CSV contains no readable rows.')
    df = pd.concat(chunks, ignore_index=True)
    grouped = df.groupby('window_start', sort=True)
    features = pd.DataFrame(index=grouped.size().index)
    features['total_flows'] = grouped.size()
    features['total_packets'] = grouped['Total Fwd Packets'].sum() + grouped['Total Backward Packets'].sum()
    features['total_bytes'] = grouped['Total Length of Fwd Packets'].sum() + grouped['Total Length of Bwd Packets'].sum()
    features['unique_source_ips'] = grouped['Source IP'].nunique()
    features['unique_dest_ips'] = grouped['Destination IP'].nunique()
    features['unique_source_ports'] = grouped['Source Port'].nunique()
    features['unique_dest_ports'] = grouped['Destination Port'].nunique()
    features['tcp_flow_count'] = grouped['Protocol'].apply(lambda s: (s == 6).sum())
    features['udp_flow_count'] = grouped['Protocol'].apply(lambda s: (s == 17).sum())
    for out, col in [('syn_count','SYN Flag Count'),('ack_count','ACK Flag Count'),('rst_count','RST Flag Count'),('fin_count','FIN Flag Count'),('psh_count','PSH Flag Count'),('urg_count','URG Flag Count')]:
        features[out] = grouped[col].sum()
    for out, col in [('avg_flow_duration','Flow Duration'),('avg_packet_size','Average Packet Size'),('std_packet_size','Packet Length Std'),('avg_flow_bytes_per_sec','Flow Bytes/s'),('avg_flow_packets_per_sec','Flow Packets/s'),('avg_fwd_packets','Total Fwd Packets'),('avg_bwd_packets','Total Backward Packets'),('avg_fwd_bytes','Total Length of Fwd Packets'),('avg_bwd_bytes','Total Length of Bwd Packets'),('avg_flow_iat_mean','Flow IAT Mean'),('avg_fwd_iat_mean','Fwd IAT Mean'),('avg_bwd_iat_mean','Bwd IAT Mean'),('avg_active_mean','Active Mean'),('avg_idle_mean','Idle Mean'),('avg_subflow_fwd_pkts','Subflow Fwd Packets'),('avg_subflow_bwd_pkts','Subflow Bwd Packets')]:
        features[out] = grouped[col].mean()
    features['max_flow_duration'] = grouped['Flow Duration'].max()
    features['max_packet_size'] = grouped['Max Packet Length'].max()
    features['min_packet_size'] = grouped['Min Packet Length'].min()
    latest = features.sort_index().iloc[-1].to_dict()
    latest = {k: float(v) if pd.notna(v) else 0.0 for k, v in latest.items()}
    return latest, rows, len(features)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model_artifacts()
    yield


app = FastAPI(title="Network Attack Forecasting API", version="1.0.0", lifespan=lifespan)


@app.get('/', response_model=RootResponse)
async def root():
    return RootResponse(message='Network Attack Forecasting API', version='1.0.0', endpoints={'health':'GET /health','predict':'POST /predict','upload':'POST /upload-csv'})


@app.get('/health', response_model=HealthResponse)
async def health():
    model_info = get_model_info()
    if _model_loaded:
        return HealthResponse(status='healthy', model_loaded=True, model_mode='REAL_MODEL', model_info={'algorithm':'Logistic Regression','features':len(_feature_cols or []),'window_size_minutes':5,'forecast_horizon_minutes':5,'test_metrics':model_info.get('test') if model_info else None})
    return HealthResponse(status='degraded', model_loaded=False, model_mode='DEMO', model_info={'error':_model_load_error,'window_size_minutes':5,'forecast_horizon_minutes':5})


@app.post('/predict', response_model=PredictResponse)
async def predict(request: PredictRequest):
    try:
        proba, pred = predict_real_model(request.features, request.threshold) if _model_loaded else predict_demo_mode(request.features, request.threshold)
        return PredictResponse(attack_probability=proba, prediction=pred, status='ATTACK_LIKELY' if pred else 'NORMAL', mode='REAL_MODEL' if _model_loaded else 'DEMO', threshold_used=request.threshold)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Prediction failed: {e}')


@app.post('/upload-csv')
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail='Please upload a .csv file.')
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            temp_path = tmp.name
            total = 0
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_CSV_BYTES:
                    raise HTTPException(status_code=413, detail='CSV exceeds the 300 MB limit.')
                tmp.write(chunk)
        features, rows, windows = extract_latest_window_from_csv(temp_path)
        validated = WindowFeatures(**features)
        return {'filename': file.filename, 'size_bytes': total, 'rows': rows, 'windows': windows, 'latest_window': validated.dict(), 'message': 'CSV processed successfully.'}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'CSV processing failed: {e}')
    finally:
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={'detail': exc.detail})


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
