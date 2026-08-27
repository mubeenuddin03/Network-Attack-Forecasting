"""
FastAPI backend for Network Attack Forecasting.
Supports both REAL MODEL MODE (trained Logistic Regression) and DEMO MODE (fallback).
"""
import os
import json
import tempfile
import time
import hashlib
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List, Literal


MODEL_DIR = Path("models/baseline")
FEATURE_COLS_PATH = MODEL_DIR / "feature_cols.json"
MODEL_PATH = MODEL_DIR / "model.joblib"
SCALER_PATH = MODEL_DIR / "scaler.joblib"
METRICS_PATH = MODEL_DIR / "metrics.json"

MAX_UPLOAD_BYTES = 300 * 1024 * 1024  # 300 MB

# Columns required by the existing CIC-IDS2017 cleaning / windowing pipeline.
REQUIRED_COLUMNS = [
    'Timestamp', 'Source IP', 'Destination IP', 'Source Port', 'Destination Port',
    'Protocol', 'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets',
    'Total Length of Fwd Packets', 'Total Length of Bwd Packets', 'SYN Flag Count',
    'ACK Flag Count', 'RST Flag Count', 'FIN Flag Count', 'PSH Flag Count',
    'URG Flag Count', 'Average Packet Size', 'Max Packet Length', 'Min Packet Length',
    'Packet Length Std', 'Flow Bytes/s', 'Flow Packets/s', 'Flow IAT Mean',
    'Fwd IAT Mean', 'Bwd IAT Mean', 'Active Mean', 'Idle Mean',
    'Subflow Fwd Packets', 'Subflow Bwd Packets', 'Label',
]

_model = None
_scaler = None
_feature_cols = None
_model_loaded = False
_model_load_error = None


class WindowFeatures(BaseModel):
    """Input features for a single 5-minute network window."""
    total_flows: float = Field(..., ge=0, description="Total number of flows in the window")
    total_packets: float = Field(..., ge=0, description="Total packets (fwd + bwd)")
    total_bytes: float = Field(..., ge=0, description="Total bytes (fwd + bwd)")
    unique_source_ips: float = Field(..., ge=0, description="Unique source IP count")
    unique_dest_ips: float = Field(..., ge=0, description="Unique destination IP count")
    unique_source_ports: float = Field(..., ge=0, description="Unique source port count")
    unique_dest_ports: float = Field(..., ge=0, description="Unique destination port count")
    tcp_flow_count: float = Field(..., ge=0, description="TCP flow count")
    udp_flow_count: float = Field(..., ge=0, description="UDP flow count")
    syn_count: float = Field(..., ge=0, description="SYN flag count")
    ack_count: float = Field(..., ge=0, description="ACK flag count")
    rst_count: float = Field(..., ge=0, description="RST flag count")
    fin_count: float = Field(..., ge=0, description="FIN flag count")
    psh_count: float = Field(..., ge=0, description="PSH flag count")
    urg_count: float = Field(..., ge=0, description="URG flag count")
    avg_flow_duration: float = Field(..., description="Average flow duration")
    max_flow_duration: float = Field(..., description="Maximum flow duration")
    std_flow_duration: float = Field(..., description="Std deviation of flow duration")
    avg_packet_size: float = Field(..., description="Average packet size")
    max_packet_size: float = Field(..., description="Maximum packet length")
    min_packet_size: float = Field(..., description="Minimum packet length")
    std_packet_size: float = Field(..., description="Std deviation of packet length")
    avg_flow_bytes_per_sec: float = Field(..., description="Average flow bytes per second")
    avg_flow_packets_per_sec: float = Field(..., description="Average flow packets per second")
    avg_fwd_packets: float = Field(..., description="Average forward packets per flow")
    avg_bwd_packets: float = Field(..., description="Average backward packets per flow")
    avg_fwd_bytes: float = Field(..., description="Average forward bytes per flow")
    avg_bwd_bytes: float = Field(..., description="Average backward bytes per flow")
    avg_flow_iat_mean: float = Field(..., description="Average flow IAT mean")
    avg_fwd_iat_mean: float = Field(..., description="Average forward IAT mean")
    avg_bwd_iat_mean: float = Field(..., description="Average backward IAT mean")
    avg_active_mean: float = Field(..., description="Average active mean")
    avg_idle_mean: float = Field(..., description="Average idle mean")
    avg_subflow_fwd_pkts: float = Field(..., description="Average subflow forward packets")
    avg_subflow_bwd_pkts: float = Field(..., description="Average subflow backward packets")

    @validator('*', pre=True)
    def replace_nan_inf(cls, v):
        if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
            return 0.0
        return v


class PredictRequest(BaseModel):
    """Request body for /predict endpoint."""
    features: WindowFeatures
    threshold: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="Decision threshold for binary prediction")


class PredictResponse(BaseModel):
    """Response body for /predict endpoint."""
    attack_probability: float = Field(..., ge=0.0, le=1.0, description="Probability of attack in next 5-minute window")
    prediction: int = Field(..., ge=0, le=1, description="Binary prediction (1=attack likely, 0=normal)")
    status: Literal["ATTACK_LIKELY", "NORMAL"] = Field(..., description="Human-readable status")
    mode: Literal["REAL_MODEL", "DEMO"] = Field(..., description="Whether prediction used real model or demo fallback")
    threshold_used: float = Field(..., description="Threshold used for binary decision")


class HealthResponse(BaseModel):
    """Response body for /health endpoint."""
    status: Literal["healthy", "degraded"]
    model_loaded: bool
    model_mode: Literal["REAL_MODEL", "DEMO"]
    model_info: Optional[dict] = None


class RootResponse(BaseModel):
    """Response body for / endpoint."""
    message: str
    version: str
    endpoints: dict


def load_model_artifacts():
    """Load model, scaler, and feature columns from disk."""
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
        print(f"Loaded real model from {MODEL_DIR}")
        print(f"   Features: {len(_feature_cols)}")
        
    except Exception as e:
        _model_load_error = str(e)
        _model_loaded = False
        print(f"Failed to load real model: {e}")
        print("   Falling back to DEMO MODE")


def get_model_info() -> Optional[dict]:
    """Get model metadata if available."""
    if not METRICS_PATH.exists():
        return None
    try:
        with open(METRICS_PATH) as f:
            return json.load(f)
    except Exception:
        return None


def predict_real_model(features: WindowFeatures, threshold: float) -> tuple:
    """Predict using the real trained model."""
    if not _model_loaded:
        raise RuntimeError("Real model not loaded")
    
    # Convert to DataFrame with correct column order
    feature_dict = features.dict()
    X = pd.DataFrame([feature_dict])[_feature_cols]
    
    # Handle NaN/Inf (same as training)
    X = X.replace([np.inf, -np.inf], np.nan)
    X = X.fillna(X.median())
    
    # Scale and predict
    X_scaled = _scaler.transform(X)
    proba = float(_model.predict_proba(X_scaled)[:, 1][0])
    pred = int(proba >= threshold)
    
    return proba, pred


def predict_demo_mode(features: WindowFeatures, threshold: float) -> tuple:
    """
    Demo mode fallback: simple heuristic based on attack-like features.
    This is NOT a trained model - clearly marked as DEMO.
    """
    # Simple heuristic: high SYN count, high unique ports, high flow count -> suspicious
    syn_rate = features.syn_count / max(features.total_flows, 1)
    port_diversity = (features.unique_source_ports + features.unique_dest_ports) / max(features.total_flows, 1)
    flow_intensity = features.total_flows / 1000.0  # normalize
    
    # Heuristic score (0-1)
    score = min(1.0, (syn_rate * 2.0) + (port_diversity * 1.5) + (flow_intensity * 0.5))
    
    # Add some randomness to simulate model uncertainty
    np.random.seed(int(features.total_flows * 1000) % 2**32)
    score = np.clip(score + np.random.normal(0, 0.1), 0, 1)
    
    proba = float(score)
    pred = int(proba >= threshold)
    
    return proba, pred


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    load_model_artifacts()
    yield
    # Cleanup if needed


from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi import APIRouter

app = FastAPI(
    title="Network Attack Forecasting API",
    description="Predict attack likelihood in the next 5-minute window based on current network behavior",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()


@api_router.get("/", response_model=RootResponse)
@app.get("/api-info", response_model=RootResponse)
async def root():
    """Root endpoint with API information."""
    return RootResponse(
        message="Network Attack Forecasting API",
        version="1.0.0",
        endpoints={
            "health": "GET /api/health or /health - Check API and model status",
            "predict": "POST /api/predict or /predict - Predict attack probability",
            "upload": "POST /api/upload or /upload - Multipart CSV upload & World Model rollout",
            "benchmarks": "GET /api/benchmarks or /benchmarks - Empirical comparative metrics",
            "rollout": "POST /api/rollout or /rollout - Autoregressive K-step state simulation",
            "docs": "GET /docs - Interactive Swagger API documentation"
        }
    )


@api_router.get("/health", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    model_info = get_model_info()
    
    if _model_loaded:
        return HealthResponse(
            status="healthy",
            model_loaded=True,
            model_mode="REAL_MODEL",
            model_info={
                "algorithm": "Logistic Regression",
                "features": len(_feature_cols) if _feature_cols else 0,
                "window_size_minutes": 5,
                "forecast_horizon_minutes": 5,
                "test_metrics": model_info.get("test") if model_info else None
            }
        )
    else:
        return HealthResponse(
            status="degraded",
            model_loaded=False,
            model_mode="DEMO",
            model_info={
                "note": "Real model not loaded, using demo fallback",
                "error": _model_load_error,
                "window_size_minutes": 5,
                "forecast_horizon_minutes": 5
            }
        )


@api_router.get("/benchmarks")
@app.get("/benchmarks")
async def get_benchmarks():
    """Return real evaluation metrics comparing Baseline LR vs Temporal World Model."""
    baseline_metrics = {}
    world_model_metrics = {}

    if METRICS_PATH.exists():
        with open(METRICS_PATH) as f:
            baseline_metrics = json.load(f)

    wm_metrics_path = Path("models/world_model/metrics.json")
    if wm_metrics_path.exists():
        with open(wm_metrics_path) as f:
            world_model_metrics = json.load(f)

    return {
        "baseline_model": {
            "name": "Logistic Regression (Per-Flow/Window Baseline)",
            "metrics": baseline_metrics
        },
        "world_model": {
            "name": "Temporal World Model (P(S_{t+1}|S_t) Multi-Output Dynamics)",
            "metrics": world_model_metrics
        }
    }


@api_router.post("/rollout")
@app.post("/rollout")
async def forward_rollout(request: PredictRequest, k_steps: int = 4):
    """Execute real autoregressive K-step forward simulation from input state."""
    from src.models.world_model import get_world_model
    wm = get_world_model()
    if wm is None or not wm.is_fitted:
        raise HTTPException(status_code=503, detail="World model not loaded.")
    
    trajectory = wm.rollout(request.features, k_steps=k_steps, window_minutes=5)
    return {
        "k_steps": k_steps,
        "trajectory": trajectory
    }


@api_router.post("/predict", response_model=PredictResponse)
@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Predict attack probability for the next 5-minute window.
    
    Input: 35 aggregated network-state features from the current 5-minute window.
    Output: Attack probability, binary prediction, and status.
    """
    features = request.features
    threshold = request.threshold
    
    try:
        if _model_loaded:
            proba, pred = predict_real_model(features, threshold)
            mode = "REAL_MODEL"
        else:
            proba, pred = predict_demo_mode(features, threshold)
            mode = "DEMO"
        
        status_str = "ATTACK_LIKELY" if pred == 1 else "NORMAL"
        
        return PredictResponse(
            attack_probability=proba,
            prediction=pred,
            status=status_str,
            mode=mode,
            threshold_used=threshold
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


def _safe_float(value):
    try:
        if value is None or pd.isna(value) or np.isinf(value):
            return 0.0
    except (TypeError, ValueError):
        return 0.0
    return float(value)


def _cleanup_tmp(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def process_upload(tmp_csv_path: str, original_filename: str, file_size: int) -> dict:
    """Run the cleaning + windowing pipeline on an uploaded CSV and
    produce real World Model state predictions and autoregressive K-step rollout.

    Raises ValueError for user-facing data problems (=> HTTP 400/422)."""
    from src.data.schema_detector import detect_column_mappings, standardize_dataframe
    from src.data.clean_data import clean_data
    from src.data.create_windows import create_forecasting_dataset
    from src.models.world_model import get_world_model, STATE_FEATURES

    # 1. Inspect and validate schema
    preview = pd.read_csv(tmp_csv_path, nrows=5)
    if preview.empty:
        raise ValueError("The CSV file is empty (no columns detected).")
    
    col_mapping, detected, missing_critical = detect_column_mappings(list(preview.columns))
    if missing_critical:
        raise ValueError(
            f"CSV detected, but required network features could not be mapped. "
            f"Missing: {', '.join(missing_critical)}. "
            f"Detected: {', '.join(detected) if detected else 'None'}."
        )

    content_hash = hashlib.sha256(open(tmp_csv_path, 'rb').read()).hexdigest()[:16]
    cleaned_path = f"data/processed/uploaded_cleaned_{content_hash}.parquet"
    windowed_path = f"data/processed/uploaded_windowed_{content_hash}.parquet"

    df_clean = clean_data(tmp_csv_path, cleaned_path)
    if df_clean.empty:
        raise ValueError("No valid rows remained after cleaning — the CSV may be malformed or empty.")

    windows_df = create_forecasting_dataset(cleaned_path, windowed_path)
    if windows_df.empty or len(windows_df) < 1:
        raise ValueError(
            "Could not build any 5-minute windows. Ensure the Timestamp column "
            "spans at least 5 minutes of traffic."
        )

    if not _model_loaded:
        load_model_artifacts()

    last = windows_df.iloc[-1]
    features_dict = {col: _safe_float(last.get(col, 0.0)) for col in STATE_FEATURES if col in last}

    # 2. Execute Real Model Inference
    if _model_loaded and _model is not None and _scaler is not None and _feature_cols is not None:
        X = pd.DataFrame([last])[_feature_cols]
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(0.0)
        X_scaled = _scaler.transform(X)
        proba = float(_model.predict_proba(X_scaled)[:, 1][0])
        pred = int(proba >= 0.5)
        mode = "REAL_MODEL"
    else:
        syn_rate = float(last.get('syn_count', 0)) / max(float(last.get('total_flows', 1)), 1.0)
        port_div = (float(last.get('unique_source_ports', 0)) + float(last.get('unique_dest_ports', 0))) / max(float(last.get('total_flows', 1)), 1.0)
        flow_intensity = float(last.get('total_flows', 0)) / 1000.0
        score = min(1.0, max(0.0, (syn_rate * 2.0) + (port_div * 1.5) + (flow_intensity * 0.5)))
        proba = float(score)
        pred = int(proba >= 0.5)
        mode = "DEMO"

    # 3. Execute Real World Model K-Step Autoregressive Rollout
    wm = get_world_model()
    if wm is not None and wm.is_fitted:
        horizons = wm.rollout(features_dict, k_steps=4, window_minutes=5)
    else:
        horizons = []

    return {
        "dataset": {
            "filename": original_filename,
            "file_size_bytes": file_size,
            "row_count": int(df_clean.shape[0]),
            "window_count": int(len(windows_df)),
            "time_range_start": windows_df['window_start'].min().isoformat(),
            "time_range_end": windows_df['window_end'].max().isoformat(),
            "schema_info": {
                "mapped_columns": len(col_mapping),
                "detected_canonical": detected,
            }
        },
        "prediction": {
            "attack_probability": proba,
            "prediction": pred,
            "status": "ATTACK_LIKELY" if pred == 1 else "NORMAL",
            "mode": mode,
            "threshold_used": 0.5,
            "window_start": pd.Timestamp(last['window_start']).isoformat(),
            "window_end": pd.Timestamp(last['window_end']).isoformat(),
            "features": features_dict,
            "horizons": horizons,
            "rollout": horizons,
        },
    }


@api_router.post("/upload", response_model=None)
@app.post("/upload", response_model=None)
async def upload_csv(file: UploadFile = File(...)):
    """Multipart CSV upload (max 300 MB) -> clean, window, and run the
    existing trained model on the latest valid 5-minute window."""
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    tmp_path = os.path.join(
        tempfile.gettempdir(), f"naf_upload_{os.getpid()}_{int(time.time() * 1000)}.csv"
    )

    # Stream to disk while enforcing the size limit (no full in-memory load).
    total = 0
    try:
        with open(tmp_path, 'wb') as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the 300 MB limit (received {total // (1024 * 1024)} MB).",
                    )
                out.write(chunk)
    except HTTPException:
        _cleanup_tmp(tmp_path)
        raise
    except Exception as e:
        _cleanup_tmp(tmp_path)
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {e}")

    try:
        result = process_upload(tmp_path, file.filename, total)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {e}")
    finally:
        _cleanup_tmp(tmp_path)

    return result


# Include the API router so /api/* routes resolve identically
app.include_router(api_router, prefix="/api")

# Serve React SPA from frontend/dist
DIST_DIR = Path("frontend/dist")
if DIST_DIR.exists():
    if (DIST_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not catch openapi / docs
        if full_path in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail="Not found")
        target_file = DIST_DIR / full_path
        if full_path and target_file.exists() and target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(DIST_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)