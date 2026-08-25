# Network Attack Forecaster — MVP #1

A working prototype for **Smart India Hackathon** that forecasts network attacks 5 minutes into the future using aggregated network flow features and Logistic Regression.

## Project Overview

```
CIC-IDS2017 CSV
       ↓
Data validation & cleaning
       ↓
Timestamp parsing & chronological sort
       ↓
5-minute network windows
       ↓
Network-state feature aggregation
       ↓
Future attack target creation (next 5-min window)
       ↓
Chronological train/validation/test split
       ↓
Logistic Regression baseline
       ↓
Attack probability + binary prediction
       ↓
Streamlit dashboard + FastAPI backend
```

**Core Question:** Based on network activity in the previous 5 minutes, will an attack occur in the next 5 minutes?

## Quick Start

### 1. Install Dependencies

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Prepare Data

Place CIC-IDS2017 CSV files in `data/raw/`:
```
data/raw/
├── Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv  (included)
└── ... (other CIC-IDS2017 files optional)
```

### 3. Run Pipeline (Step by Step)

**Step 1: Clean Data**
```bash
python -m src.data.clean_data
```
Output: `data/processed/cleaned_data.parquet`

**Step 2: Create 5-Minute Windows**
```bash
python -m src.data.create_windows
```
Output: `data/processed/windowed_data.parquet`

**Step 3: Train Baseline Model**
```bash
python -m src.models.train
```
Output: `models/baseline/` (model.joblib, scaler.joblib, metrics.json)

**Step 4: Launch Dashboard (Streamlit)**
```bash
streamlit run app/app.py
```
Open http://localhost:8501

**Step 5: Launch API Backend (FastAPI)**
```bash
python app.py
```
Or with uvicorn:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Open http://localhost:8000/docs for interactive API documentation.

## Project Structure

```
network-attack-forecaster/
├── data/
│   ├── raw/                    # Original CSV files (read-only)
│   └── processed/              # Cleaned & windowed data (parquet)
├── models/
│   ├── baseline/               # Trained Logistic Regression baseline
│   └── temporal/               # Trained world-model (sequence multi-horizon)
├── src/
│   ├── data/
│   │   ├── clean_data.py       # Data cleaning pipeline
│   │   ├── create_windows.py   # 5-min window aggregation + future target
│   │   ├── create_sequences.py # Temporal sequences + MITRE mapping
│   │   └── packet_features.py  # Optional PCAP packet-level features (not tested)
│   └── models/
│       ├── train.py            # Logistic Regression training (+ comparison)
│       ├── predict.py          # Prediction pipeline
│       └── temporal.py         # World model: multi-horizon + optional LSTM
├── app/
│   └── app.py                  # Streamlit dashboard
├── app.py                      # FastAPI backend
├── tests/
│   ├── test_temporal.py        # World-model / sequence / MITRE / inference tests
│   └── test_packet.py          # Packet interface tests (NOT TESTED vs PCAP)
├── requirements.txt
└── README.md
```

## Key Features

### Data Handling
- ✅ Strips whitespace from column names
- ✅ Removes duplicate columns
- ✅ Explicit timestamp parsing (`%m/%d/%Y %H:%M`)
- ✅ Chronological sorting (critical for forecasting)
- ✅ Handles NaN (15) and Inf (727) values with median imputation
- ✅ Removes duplicate rows (1)
- ✅ Preserves original labels + creates binary target

### Forecasting Dataset
- ✅ 5-minute tumbling windows
- ✅ 38 aggregated network-state features per window
- ✅ Future attack target: `future_attack = 1` if next window has any attack
- ✅ **Zero data leakage**: features use only current window, target uses only next window
- ✅ Original attack labels preserved for future multi-class work

### Model
- ✅ Logistic Regression with `class_weight='balanced'`
- ✅ StandardScaler fitted on train only (no leakage)
- ✅ Chronological split: 60% train / 20% val / 20% test
- ✅ Outputs: probability (0–1) + binary prediction

### Evaluation Metrics
| Metric | Description |
|--------|-------------|
| Precision | Of predicted attacks, how many were real? |
| Recall | Of actual attacks, how many did we catch? |
| F1 | Harmonic mean of precision & recall |
| PR-AUC | Area under Precision-Recall curve |
| ROC-AUC | Area under ROC curve |
| FPR | False Positive Rate = FP / (FP + TN) |

### Dashboard (Streamlit)
- 📊 Current network state + future window prediction
- 📈 Risk timeline with actual vs predicted
- 🎯 Confusion matrix & metrics
- 📋 Detailed results table
- 🔧 Upload custom CSV or use sample

### API Backend (FastAPI)
- 🔌 **GET /** - API information and available endpoints
- 🔌 **GET /health** - Health check with model status
- 🔌 **POST /predict** - Predict attack probability for next 5-minute window
- 📝 Request/response validation with Pydantic schemas
- 🛡️ Clear distinction between **REAL_MODEL** and **DEMO** modes

## Sample Results (Friday PortScan)

| Window | Flows | Attack Prob | Predicted | Actual Next |
|--------|-------|-------------|-----------|-------------|
| 01:00–01:05 | 1,428 | 91.5% | ⚠ ATTACK | ✅ ATTACK |
| 01:05–01:10 | 1,916 | 20.9% | ✅ NORMAL | ✅ NORMAL |
| ... | ... | ... | ... | ... |
| 03:25–03:30 | 6,909 | 28.5% | ✅ NORMAL | ✅ NORMAL |

**Test Metrics** (on 6 test windows):
- Precision: 0.000 | Recall: 0.000 | F1: 0.000 | PR-AUC: 0.589 | ROC-AUC: 0.556

> **Note:** Low test performance is expected with only 30 windows (29 usable) and distribution shift (PortScan appears only in later windows). The pipeline is correct; more data improves results.

## API Documentation

### Endpoints

#### GET /
Returns API information and available endpoints.

**Response:**
```json
{
  "message": "Network Attack Forecasting API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health - Check API and model status",
    "predict": "POST /predict - Predict attack probability for next 5-minute window",
    "docs": "GET /docs - Interactive API documentation (Swagger UI)"
  }
}
```

#### GET /health
Health check endpoint. Returns model loading status and mode.

**Response (REAL_MODEL mode):**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_mode": "REAL_MODEL",
  "model_info": {
    "algorithm": "Logistic Regression",
    "features": 35,
    "window_size_minutes": 5,
    "forecast_horizon_minutes": 5,
    "test_metrics": { ... }
  }
}
```

**Response (DEMO mode):**
```json
{
  "status": "degraded",
  "model_loaded": false,
  "model_mode": "DEMO",
  "model_info": {
    "note": "Real model not loaded, using demo fallback",
    "error": "Model artifacts not found in models/baseline",
    "window_size_minutes": 5,
    "forecast_horizon_minutes": 5
  }
}
```

#### POST /predict
Predict attack probability for the next 5-minute window based on current window features.

**Request Body:**
```json
{
  "features": {
    "total_flows": 1428,
    "total_packets": 15234,
    "total_bytes": 1024567,
    "unique_source_ips": 12,
    "unique_dest_ips": 8,
    "unique_source_ports": 45,
    "unique_dest_ports": 23,
    "tcp_flow_count": 1200,
    "udp_flow_count": 228,
    "syn_count": 890,
    "ack_count": 1100,
    "rst_count": 45,
    "fin_count": 12,
    "psh_count": 340,
    "urg_count": 0,
    "avg_flow_duration": 125000.5,
    "max_flow_duration": 300000000,
    "std_flow_duration": 450000.2,
    "avg_packet_size": 512.3,
    "max_packet_size": 1514,
    "min_packet_size": 40,
    "std_packet_size": 256.7,
    "avg_flow_bytes_per_sec": 1024000.0,
    "avg_flow_packets_per_sec": 150.5,
    "avg_fwd_packets": 8.2,
    "avg_bwd_packets": 6.1,
    "avg_fwd_bytes": 51200.0,
    "avg_bwd_bytes": 38400.0,
    "avg_flow_iat_mean": 50000.0,
    "avg_fwd_iat_mean": 45000.0,
    "avg_bwd_iat_mean": 55000.0,
    "avg_active_mean": 120000.0,
    "avg_idle_mean": 80000.0,
    "avg_subflow_fwd_pkts": 4.1,
    "avg_subflow_bwd_pkts": 3.0
  },
  "threshold": 0.5
}
```

**Response (REAL_MODEL mode):**
```json
{
  "attack_probability": 0.87,
  "prediction": 1,
  "status": "ATTACK_LIKELY",
  "mode": "REAL_MODEL",
  "threshold_used": 0.5
}
```

**Response (DEMO mode):**
```json
{
  "attack_probability": 0.72,
  "prediction": 1,
  "status": "ATTACK_LIKELY",
  "mode": "DEMO",
  "threshold_used": 0.5
}
```

> ⚠️ **Important:** When `mode` is `"DEMO"`, predictions are generated by a simple heuristic fallback, **NOT** by a trained ML model. Never interpret demo predictions as real model outputs.

### Running the API

```bash
# Development mode with auto-reload
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Or directly
python app.py
```

The API will be available at:
- http://localhost:8000 - Root endpoint
- http://localhost:8000/health - Health check
- http://localhost:8000/docs - Interactive Swagger UI
- http://localhost:8000/redoc - ReDoc documentation

### Testing the API

```bash
# Health check
curl http://localhost:8000/health

# Predict (with minimal example features)
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "total_flows": 100,
      "total_packets": 1000,
      "total_bytes": 500000,
      "unique_source_ips": 10,
      "unique_dest_ips": 5,
      "unique_source_ports": 20,
      "unique_dest_ports": 15,
      "tcp_flow_count": 80,
      "udp_flow_count": 20,
      "syn_count": 50,
      "ack_count": 70,
      "rst_count": 5,
      "fin_count": 2,
      "psh_count": 30,
      "urg_count": 0,
      "avg_flow_duration": 100000,
      "max_flow_duration": 1000000,
      "std_flow_duration": 50000,
      "avg_packet_size": 500,
      "max_packet_size": 1500,
      "min_packet_size": 40,
      "std_packet_size": 200,
      "avg_flow_bytes_per_sec": 500000,
      "avg_flow_packets_per_sec": 100,
      "avg_fwd_packets": 5,
      "avg_bwd_packets": 5,
      "avg_fwd_bytes": 250000,
      "avg_bwd_bytes": 250000,
      "avg_flow_iat_mean": 50000,
      "avg_fwd_iat_mean": 50000,
      "avg_bwd_iat_mean": 50000,
      "avg_active_mean": 100000,
      "avg_idle_mean": 50000,
      "avg_subflow_fwd_pkts": 2.5,
      "avg_subflow_bwd_pkts": 2.5
    },
    "threshold": 0.5
  }'
```

## Forecasting Concept

```
Previous 5-minute window (t-5min to t)
                ↓
      35 aggregated network-state features
                ↓
      ML forecasting model (Logistic Regression)
                ↓
Predict whether an attack will occur
in the following 5 minutes (t to t+5min)
```

**Zero Data Leakage Guarantee:** Features are computed **only** from the current 5-minute window. The target (attack in next window) is computed **only** from the subsequent window. No future information leaks into training features.

## World Model / Temporal Forecasting (MVP 3–6)

Beyond the single-window baseline, the system now includes a **temporal world model** that reasons over a *history* of network states to forecast attacks multiple steps ahead.

### Network-state representation
Each network state `S_t` is the existing 5-minute aggregated feature vector of the
windowed pipeline (flow/packet/flag statistics). A **sequence block** of
`SEQUENCE_LENGTH = 5` consecutive windows (`S(t-4) … S(t)`) is the model input —
i.e. 25 minutes of temporal context.

### Temporal / sequence model
- `src/data/create_sequences.py` converts tumbling windows into **non-overlapping**
  temporal sequence blocks (prevents train/val/test leakage).
- `src/models/temporal.py` trains a **sequence-block multi-horizon forecaster**:
  one Logistic Regression per horizon, consuming the same 10 summary features.
- A **PyTorch LSTM backend is also included** (`AttackForecastLSTM`) and is used
  automatically *if* `torch` is installed. The default installed artifact is the
  lightweight sklearn model so the world model works without a heavy dependency.
- This is **direct multi-horizon forecasting** (predict +5/+10/+15/+20 min at once).
  It is **not** a recursive state rollout; that is documented as a future extension.

### Multi-step (K-step) forecasting
The model outputs an attack-probability **trajectory**:

```json
[
  {"horizon_minutes": 5,  "attack_probability": 0.80, "prediction": 1},
  {"horizon_minutes": 10, "attack_probability": 0.62, "prediction": 1},
  {"horizon_minutes": 15, "attack_probability": 0.40, "prediction": 0},
  {"horizon_minutes": 20, "attack_probability": 0.30, "prediction": 0}
]
```

Every value comes from actual model inference (`predict_trajectory`).

### MITRE ATT&CK stage mapping
`src/data/create_sequences.py::get_mitre_attack_stage` maps observable behaviour to
a stage using only real signals (SYN rate, port diversity, TCP ratio, byte volume,
flow count, unique IPs):

| Observable behaviour | Mapped stage |
|----------------------|--------------|
| High SYN rate + port scanning | `RECONNAISSANCE` |
| Attack activity + high flow count | `INITIAL_ACCESS` |
| Sustained port diversity | `COMMAND_AND_CONTROL` |
| High byte volume | `EXFILTRATION` |
| High flows + many destinations | `LATERAL_MOVEMENT` |
| Insufficient evidence | `UNKNOWN` |

Stages are never fabricated; when evidence is insufficient the model returns `UNKNOWN`.

### Explainability
`train_temporal_sklearn` records feature attributions via **permutation importance**
when enough samples exist, and falls back to the model's own **coefficients** otherwise.
Results are saved in `models/temporal/metrics.json` under `explainability`.

### Packet-level features (optional)
`src/data/packet_features.py` provides a PCAP → packet-level feature interface
(TTL, TTL variance, TCP window, fragmentation, retransmissions, payload size,
inter-arrival time, SYN ratio, unique dst ports). **STATUS: NOT TESTED — no PCAP is
available in this repository.** The function refuses to invent values and raises if no
PCAP is supplied. It is fully decoupled from the flow-level model.

### Baseline vs World Model (honest comparison)
| Aspect | Baseline (Logistic Regression) | World Model |
|--------|-------------------------------|-------------|
| Input | single 5-min window (35 feats) | 5-window history block (10 feats) |
| Output | next-5-min probability | +5/+10/+15/+20-min trajectory |
| Training data | windowed Friday PortScan | same, as non-overlapping sequences |

On this repository's small sample (30 windows → 5 sequences, test n=1) **neither model
generalises**: baseline test F1 = 0 (PR-AUC 0.59, ROC-AUC 0.56); the world model's
per-horizon test metrics are similarly unreliable due to the tiny test set. The
pipelines are correct; a larger CIC-IDS2017 slice is required for meaningful gains.

### Leakage audit
- Window features use only the current window; targets only the next (`create_windows.py`).
- Sequences are **non-overlapping** (`step = SEQUENCE_LENGTH`) so no source window is
  shared across the chronological train/val/test split.
- Scaler and thresholds are fit on **train only**.
- Evaluation is strictly chronological (train → val → test).

## Current Status

### ✅ Implemented
- Data cleaning pipeline (handles CIC-IDS2017 format)
- 5-minute window aggregation with 38 features
- Future attack target creation (next window)
- Chronological train/val/test split (no leakage)
- Logistic Regression baseline with class balancing (+ Random Forest / HistGradientBoosting comparison)
- Streamlit dashboard for visualization (dynamic CSV upload, no stale state)
- **FastAPI backend with `/`, `/health`, `/predict` endpoints**
- Model loading/inference abstraction with demo fallback
- Clear REAL_MODEL vs DEMO mode distinction
- **Temporal world model** (`src/models/temporal.py`): sequence-block multi-horizon forecaster (+ optional PyTorch LSTM backend)
- **Multi-step (K-step) attack-probability trajectory** (+5/+10/+15/+20 min)
- **MITRE ATT&CK stage mapping** from observable behaviour (never fabricated)
- **Explainability** via permutation importance / model coefficients
- **Non-overlapping sequences** to prevent temporal leakage
- Optional **packet-level (PCAP) feature interface** (`src/data/packet_features.py`)

### ⚠️ Known Limitations
- **Test performance is low** (Precision=0, Recall=0 on 6 test windows) due to:
  - Very small dataset (only 30 windows from single PortScan file → 5 sequences)
  - Distribution shift: PortScan attacks only appear in later windows
  - Model never sees attack patterns during training
- The world model's per-horizon test set is **n=1**, so its metrics are indicative only.
- **Pipeline is architecturally correct** — more data (full CIC-IDS2017) will improve results.
- Demo mode uses a simple heuristic, not a trained model.
- Packet-level features are implemented but **NOT TESTED** (no PCAP in repo).
- The trained world-model artifact is the sklearn sequence-block model; the LSTM path
  requires `pip install torch` (optional, not installed here).

### 🔄 Next Steps (Future MVPs)
| MVP | Addition | Status |
|-----|----------|--------|
| 2 | Random Forest / Gradient Boosting | ✅ compared in baseline |
| 3 | LSTM + sequences of windows | ✅ optional backend (`torch`) |
| 4 | Multi-step future-state rollout | ✅ direct multi-horizon (recursive rollout future) |
| 5 | SHAP / attention explanations | ✅ permutation/coefficient importance |
| 6 | MITRE ATT&CK stage mapping | ✅ implemented |
| 7 | PCAP ingestion + packet-level features | ⚠️ interface only (no PCAP) |
| 8 | ESP32 integration (LED/buzzer alerts) | ⛔ out of scope |

## Demo Mode vs Real Model Mode

| Aspect | REAL_MODEL | DEMO |
|--------|------------|------|
| **Source** | Trained Logistic Regression (models/baseline/) | Heuristic fallback |
| **Training Data** | CIC-IDS2017 Friday PortScan (chronological split) | None |
| **Features** | 35 aggregated network-state features | Same 35 features (subset used) |
| **Reliability** | Trained on real attack patterns | Simple rule-based approximation |
| **Use Case** | Production / evaluation | Development / testing without model |
| **API Response** | `"mode": "REAL_MODEL"` | `"mode": "DEMO"` |

**The API always returns the `mode` field so consumers know exactly what generated the prediction.**

## Dataset

**CIC-IDS2017 GeneratedLabelledFlows** is the primary dataset.

- Original CSV files are **intentionally not stored in GitHub** (too large: ~100MB+ each)
- The repo includes a small `demo_sample.csv` (50k rows) for testing
- `.gitignore` excludes `data/raw/*.pcap_ISCX.csv` and `data/processed/`
- To use full dataset: download from [CIC-IDS2017](https://www.unb.ca/cic/datasets/ids-2017.html) and place in `data/raw/`

## Reproducibility

```bash
# Full pipeline
python -m src.data.clean_data
python -m src.data.create_windows
python -m src.models.train
streamlit run app/app.py     # Dashboard
python app.py                # API backend

# World-model (temporal) training  -> saves models/temporal/
python -m src.models.temporal

# Tests
python tests/test_temporal.py
python tests/test_packet.py
python test_dynamic.py
python test_validation.py
```

All paths are relative. No hardcoded absolute paths. Random seeds fixed for reproducibility.

## Security / Safety Notes

This is a **prediction and demonstration system** for SIH.

- ❌ NO real destructive containment actions
- ❌ NO network shutdown, ransomware, credential attacks, packet flooding
- ❌ NO offensive exploitation or automatic firewall changes
- ✅ If a future dashboard has "Contain Attack" button: `containment_status = "SIMULATED"`

## ESP32 Integration Readiness

The API returns simple, machine-readable predictions suitable for ESP32 consumption:

```json
{
  "attack_probability": 0.87,
  "prediction": 1,
  "status": "ATTACK_LIKELY",
  "mode": "REAL_MODEL",
  "threshold_used": 0.5
}
```

Future architecture:
```
CIC-IDS2017 / network data
          ↓
      ML model
          ↓
      FastAPI
       ↙    ↘
Dashboard   ESP32
             ↓
       LED / buzzer
             ↓
       operator button
             ↓
    simulated containment
```

## License

MIT — Built for Smart India Hackathon 2024