# Architecture Document — SIH26153: AI-based Network Attack Forecasting

## 1. Problem Framing

**Core Task:** Forecast network infiltration probability over a future horizon, not just classify the current window.

**Formulation:** Learn the state-transition dynamics **P(S_{t+1} | S_t)** where each state S_t is a 35-dimensional aggregated network feature vector from a 5-minute tumbling window. From an initial state S_t, execute an **autoregressive K-step rollout** (K=4, i.e., +5, +10, +15, +20 minutes) to produce a probability trajectory:

```
S_t → S_{t+1} → S_{t+2} → S_{t+3} → S_{t+4}
  ↓       ↓        ↓        ↓        ↓
P_t     P_{t+1}   P_{t+2}   P_{t+3}   P_{t+4}
```

This is **forecasting**, not classification: the model predicts how the network state evolves and what the attack probability will be at each future step.

---

## 2. Data Pipeline

```
CIC-IDS2017 CSV / PCAP
         │
         ▼
┌──────────────────────────────────────┐
│  Schema Detection & Normalization    │  (src/data/schema_detector.py)
│  - Canonical column mapping          │
│  - Timestamp parsing (%m/%d/%Y %H:%M)│
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Cleaning (src/data/clean_data.py)   │
│  - Strip whitespace, dedupe columns  │
│  - NaN/Inf → median imputation       │
│  - Chronological sort                │
│  - Binary label: BENIGN=0, else=1    │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  5-Minute Window Aggregation         │  (src/data/create_windows.py)
│  - 35 flow-level features per window │
│  - Future target: attack in next win │
│  - Zero leakage: features from t,    │
│    target from t+1                   │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Packet-Level Features (Optional)    │  (src/data/packet_features.py)
│  - TTL mean/variance                 │
│  - TCP window size                   │
│  - Fragmentation count               │
│  - Retransmission count              │
│  - Payload size mean                 │
│  - Inter-arrival time mean           │
│  - SYN packet ratio                  │
│  - Unique destination ports          │
└──────────────────────────────────────┘
```

**Flow Features (35):** Total flows/packets/bytes, unique IPs/ports, TCP/UDP counts, TCP flags (SYN/ACK/RST/FIN/PSH/URG), flow duration stats, packet size stats, rate stats, forward/backward ratios, IAT stats, active/idle stats, subflow stats.

**Packet Features (10, optional):** Requires PCAP + scapy. Merged into state vector for rollout.

---

## 3. Model Architecture

### Two-Stage World Model (`src/models/world_model.py`)

```
                    ┌─────────────────────┐
         S_t ──────►│  State Transition   │  MultiOutputRegressor(Ridge)
                    │  P(S_{t+1} | S_t)   │  35 → 35 (scaled space)
                    └──────────┬──────────┘
                               │ S_{t+1}
                               ▼
                    ┌─────────────────────┐
                    │   Risk Classifier   │  LogisticRegression(balanced)
                    │   P(Attack | S)     │  35 → [0,1]
                    └──────────┬──────────┘
                               │ probability
                               ▼
                    ┌─────────────────────┐
                    │  SHAP Explainer     │  shap.LinearExplainer
                    │  Top-5 features     │  per horizon
                    └─────────────────────┘
```

**Training:**
1. Fit StandardScaler on training windows (chronological 60/20/20 split)
2. Train transition regressor: S_t(scaled) → S_{t+1}(scaled)
3. Train risk classifier: S_{t+1}(scaled) → y_{t+1} (binary attack)

**Autoregressive Rollout (K=4):**
```
S_t (observed) → predict S_{t+1} → predict S_{t+2} → predict S_{t+3} → predict S_{t+4}
                 ↓                  ↓                  ↓                  ↓
              risk(S_{t+1})      risk(S_{t+2})      risk(S_{t+3})      risk(S_{t+4})
                 ↓                  ↓                  ↓                  ↓
              SHAP(S_{t+1})      SHAP(S_{t+2})      SHAP(S_{t+3})      SHAP(S_{t+4})
```

Each horizon returns: probability, uncertainty bounds, projected MITRE stage, top-5 SHAP features, predicted state vector.

---

## 4. MITRE ATT&CK Stage Mapping (5-Stage Kill Chain)

| Stage | Tactic ID | Technique | Detection Logic |
|-------|-----------|-----------|-----------------|
| **Reconnaissance** | TA0043 | T1595 Active Scanning | High SYN rate + high port diversity |
| **Initial Access** | TA0001 | T1190 Exploit Public App | High flow volume + external IPs + attack signals |
| **Command & Control** | TA0011 | T1071 App Layer Protocol | Low bytes_fwd + consistent IAT (beaconing) + multi-dst IP + low volatility |
| **Lateral Movement** | TA0008 | T1021 Remote Services | High flows + many internal destinations |
| **Exfiltration** | TA0010 | T1041 Exfiltration Over C2 | High outbound bytes + asymmetric ratios |

Implemented in:
- `src/data/create_sequences.py::get_mitre_attack_stage()` — for sequence-level labeling
- `src/models/world_model.py::_format_horizon()` — for rollout horizon projection
- `frontend/src/components/visualizations/MitreKillChainTracker.tsx` — 5-stage visual tracker

---

## 5. Explainability

**Method:** Exact SHAP values via `shap.LinearExplainer` on the LogisticRegression risk classifier.

**Why LinearExplainer:** The risk head is a linear model → SHAP values = exact feature contributions (no sampling/approximation).

**Computation:** Performed on **scaled** state representation (matching training).

**Output:** Top-5 features by absolute SHAP value attached to **every rollout horizon**:

```json
{
  "horizonMinutes": 5,
  "probability": 0.87,
  "projectedStage": "Command & Control (T1071 Application Layer Protocol)",
  "top_features": [
    {"feature": "syn_count", "value": 0.42},
    {"feature": "unique_dest_ips", "value": -0.31},
    {"feature": "avg_flow_iat_mean", "value": 0.28},
    {"feature": "total_flows", "value": 0.19},
    {"feature": "avg_fwd_bytes", "value": -0.15}
  ],
  ...
}
```

**Frontend:** Rendered as "Feature Attribution (Top Drivers)" in `AttributionRadarChart.tsx` (radar + bar views + feature grid).

---

## 6. Benchmark

| Aspect | Baseline (Logistic Regression) | World Model |
|--------|-------------------------------|-------------|
| Input | Single 5-min window (35 feats) | 5-window history (sequence block) |
| Output | Next-window probability | K=4 step trajectory (+5..+20 min) |
| Training | Chronological 60/20/20 | Same windows, non-overlapping sequences |
| Metrics | F1, Precision, Recall, PR-AUC, ROC-AUC, FPR | Per-horizon equivalents |

**Metrics Source:** `models/baseline/metrics.json` and `models/world_model/metrics.json` (loaded via `/benchmarks` endpoint).

**Evaluation Notes:** Displayed in UI: *"Based on current training dataset size."* — test set is small (single CIC-IDS2017 Friday PortScan file).

---

## 7. System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Frontend  │◄───►│   FastAPI   │◄───►│  Trained Models  │
│  (React +   │     │  (Python)   │     │                  │
│   TypeScript)│     │             │     │  models/baseline/│
│             │     │  /predict   │     │  models/world_   │
│  Dashboard  │     │  /rollout   │     │  model/          │
│  Upload     │     │  /upload    │     │                  │
│  PCAP/CSV   │     │  /upload_   │     │  (joblib + JSON) │
│             │     │  pcap       │     │                  │
└─────────────┘     └─────────────┘     └──────────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────────────────────────────┐
│         Fully Offline               │
│  - No cloud API dependencies        │
│  - No external model services       │
│  - Runs on air-gapped networks      │
└─────────────────────────────────────┘
```

**Endpoints:**
- `GET /health` — Model status, mode (REAL_MODEL/DEMO), metrics
- `POST /predict` — Single-window attack probability (baseline LR)
- `POST /rollout` — K-step autoregressive rollout from feature dict
- `POST /upload` — CSV → clean → window → baseline + world model rollout
- `POST /upload_pcap` — PCAP/PCAPNG → packet features → world model rollout
- `GET /benchmarks` — Comparative metrics (baseline vs world model)

---

## 8. Pipeline Diagram

```
PCAP / CSV Input
       │
       ▼
┌──────────────────┐
│ Feature Extraction │
│  - Flow features  │
│  - Packet features│ (optional, PCAP only)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Window Creation  │
│ 5-min tumbling   │
│ 35 features      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  World Model     │
│ P(S_{t+1}|S_t)   │
│ Transition +     │
│ Risk Classifier  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ K-Step Rollout   │
│ S_t → S_{t+4}    │
│ Prob trajectory  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ SHAP Attribution │
│ Top-5 per horizon│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Dashboard     │
│  - Risk timeline │
│  - MITRE stages  │
│  - Attribution   │
│  - Benchmarks    │
└──────────────────┘
```

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Chronological split (not random) | Prevents temporal leakage; mimics production |
| Non-overlapping sequences | Ensures train/val/test independence |
| Direct multi-horizon (not recursive) | For sequence model; world model uses true recursive rollout |
| SHAP LinearExplainer | Exact for LogisticRegression; fast, no approximation |
| DEMO mode fallback | Works without trained models for demos |
| PCAP optional dependency | scapy not required for flow-only pipeline |
| 5-stage MITRE chain | Matches SIH requirement; actionable for defenders |

---

## 10. Limitations & Known Gaps

- **Small training data:** Only Friday PortScan file included → test metrics unreliable (F1=0 on baseline test set)
- **Packet features untested:** No PCAP in repo; interface exists but not validated
- **World model R² low:** State transition dynamics need more diverse training data
- **No hyperparameter tuning:** Fixed Ridge alpha=1.0, LR max_iter=1000
- **Single dataset:** CIC-IDS2017 only; no cross-dataset validation

---

*Document reflects implementation as of SIH 2026 submission. All components implemented in this repository.*