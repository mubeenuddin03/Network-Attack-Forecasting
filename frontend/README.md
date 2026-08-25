# Network Attack Forecasting Dashboard

A production-ready, competition-winning cybersecurity analytics dashboard for the Smart India Hackathon. Built with React 18, TypeScript, Tailwind CSS, and Framer Motion.

## Features

- **Real-time Attack Forecasting**: Predicts attack probability for the next 5-minute window
- **Cinematic Cybersecurity Aesthetic**: Premium dark theme with electric blue, violet, and amber accents
- **WebGL Network Topology**: Interactive visualization of network nodes and connections
- **Risk Timeline**: Animated SVG/Canvas chart showing historical risk and forecast horizon
- **Network State Intelligence**: Comprehensive telemetry panels with 35+ network features
- **Attack Intelligence**: MITRE ATT&CK-aligned threat progression analysis
- **Model Performance**: Transparent metrics with honest warnings about test set limitations
- **Command Palette**: Cmd/Ctrl+K fuzzy search with keyboard navigation
- **Toast Notifications**: Priority queue with progress indicators and live regions
- **Full Accessibility**: WCAG 2.1 AA, reduced motion, keyboard navigation, screen readers
- **Performance Optimized**: Lazy loading, memoization, RAF throttling, dynamic imports

## Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI primitives (Button, Card, Badge, etc.)
│   │   ├── layout/       # App shell (Sidebar, Header, Hero)
│   │   ├── visualizations/ # WebGL Canvas, SVG charts
│   │   ├── panels/       # Feature panels (KPIs, Network State, Forecast, etc.)
│   │   ├── modals/       # Modal dialogs (Prediction Inspector)
│   │   └── feedback/     # Toast system
│   ├── contexts/         # React Context providers (Dashboard, Theme, Sound, ReducedMotion)
│   ├── hooks/            # Custom hooks (useDashboardStore, etc.)
│   ├── services/         # API client with typed requests/responses
│   ├── types/            # TypeScript interfaces for API and dashboard
│   ├── utils/            # Helpers (cn, formatters, animations)
│   └── styles/           # Global CSS with Tailwind + custom properties
├── public/               # Static assets
└── index.html            # Entry HTML
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Backend API running on `http://localhost:8000` (see backend README)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Starts Vite dev server on `http://localhost:5173` with API proxy to `http://localhost:8000`.

### Environment Variables

Create `.env.local` in `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_VERSION=1.0.0
VITE_ENABLE_MOCK=false
VITE_ENABLE_SOUND=false
```

### Build

```bash
npm run build
```

Outputs to `dist/` ready for deployment.

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Backend Integration

The dashboard integrates with the existing FastAPI backend:

- `GET /` - API info
- `GET /health` - Health check with model status
- `POST /predict` - Attack probability prediction

### API Contract

**Request** (`POST /predict`):
```json
{
  "features": {
    "total_flows": 1247,
    "total_packets": 15892,
    ...
  },
  "threshold": 0.65
}
```

**Response**:
```json
{
  "attack_probability": 0.73,
  "prediction": 1,
  "status": "ATTACK_LIKELY",
  "mode": "REAL_MODEL",
  "threshold_used": 0.65
}
```

### Model Modes

- **REAL_MODEL**: Trained Logistic Regression loaded from `models/baseline/`
- **DEMO**: Heuristic fallback when model artifacts unavailable

The dashboard **never disguises DEMO mode** — shows prominent badges and warnings.

## Key Components

### Hero Section (`Hero.tsx`)
- Network topology WebGL canvas
- Primary forecast KPI card
- System status strip

### Forecast KPI Card (`ForecastKPICard.tsx`)
- Large probability display with animated counter
- Risk level classification (CRITICAL/HIGH/ELEVATED/LOW/MINIMAL)
- Threshold visualization
- Model mode indicator

### Risk Timeline (`RiskTimelineChart.tsx`)
- Canvas-based animated chart
- Historical observations + forecast horizon
- Confidence bands
- Keyboard-accessible hover crosshairs

### Network State (`NetworkStatePanel.tsx`)
- 35+ telemetry metrics as interactive cards
- Radial indicators for protocol flags
- Sparkline micro-charts

### Attack Intelligence (`AttackIntelligencePanel.tsx`)
- MITRE ATT&CK technique mapping
- Attack stage progression
- Observed vs Current vs Forecast comparison

### Model Performance (`ModelPerformancePanel.tsx`)
- Precision, Recall, F1, PR-AUC, ROC-AUC, FPR
- Confusion matrix
- **Honest warnings** for small test sets

### Prediction Inspector (`PredictionInspector.tsx`)
- Full prediction payload
- Feature breakdown by category
- Raw JSON view with copy

## Accessibility

- Semantic HTML landmarks and headings
- ARIA live regions for prediction updates
- Focus-visible outlines
- Keyboard navigation everywhere
- Reduced motion support
- High contrast mode
- Screen reader labels for charts

## Performance

- Dynamic imports for heavy modules
- `requestAnimationFrame` for animations
- RAF-throttled mouse handlers
- Memoized chart computations
- Lazy-loaded WebGL canvas
- Device capability detection

## Deployment

### Static Hosting (Vercel, Netlify, Cloudflare Pages)

```bash
npm run build
# Deploy dist/ folder
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
```

## Coexistence with Streamlit

The React dashboard is the **premium presentation frontend**. The existing Streamlit app (`app.py`) remains functional for development/debugging.

To run both:
```bash
# Terminal 1: Backend API
uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2: React Dashboard
cd frontend && npm run dev

# Terminal 3: Streamlit (optional)
streamlit run app.py --server.port 8501
```

## License

MIT License - Built for Smart India Hackathon 2024