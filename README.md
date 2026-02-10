# Texas Political Sentiment Landscape

3D visualization of real-time sentiment and conversation volume around Texas political figures across Twitter, Reddit, and news sources.

## 🎯 Current Status

**Mock data mode** — The visualization is fully functional with synthetic data. Real API integration (Composio, Claude, Supabase) coming next.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd /Users/cb/Projects/tx-sentiment-landscape

# Install dependencies for both backend and frontend
npm install
```

### Development

Run both backend and frontend in parallel:

```bash
npm run dev
```

This starts:
- **Backend:** http://localhost:3000 (Express API server)
- **Frontend:** http://localhost:3001 (React + Three.js visualization)

### Build

```bash
npm run build
```

## 📊 Features

### Visualization
- **3D Terrain** — Each political figure is a geographical region
  - Height = sentiment score (-1 to +1)
  - Color saturation = conversation volume
  - Interactive: rotate, zoom, explore

- **Sidebar** — Real-time sentiment metrics for each figure
  - Overall sentiment
  - Total mentions
  - Top issues breakdown

- **Responsive** — Works on desktop and tablet

### Data

Currently serving **mock data** with deterministic but realistic values:
- 8 Texas political figures (extensible to 10-15)
- 7 issue categories
- Daily sentiment scores with volume metrics
- Historical data for timeline scrubbing

### API Endpoints

```
GET /api/health                    — Health check
GET /api/sentiment/today           — Today's sentiment data
GET /api/sentiment/history?days=30 — Historical data (30 days default)
GET /api/terrain/mesh              — 3D mesh geometry + colors
GET /api/figures                   — Figure metadata
GET /api/sentiment/figure/:figureId — Sentiment for specific figure
```

## 🔗 Next Steps

1. **Wire up real data sources** — Composio APIs (Twitter, Reddit, news)
2. **Sentiment analysis** — Claude API for nuanced -1 to +1 scoring
3. **Persistent storage** — Supabase for daily snapshots + history
4. **Report generation** — Remotion for daily video reports
5. **Deployment** — GitHub → Netlify auto-deploy

## 🛠 Tech Stack

- **Backend** — Node.js + Express
- **Frontend** — React + Vite + Three.js
- **Visualization** — Three.js (WebGL)
- **Data (mock)** — Deterministic generation
- **Data (future)** — Composio + Claude + Supabase

## 📁 Project Structure

```
tx-sentiment-landscape/
├── backend/
│   ├── src/
│   │   ├── index.js          — Express server
│   │   └── mockData.js       — Mock data generator
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           — Main component
│   │   ├── App.css           — Styling
│   │   ├── TerrainVisualization.jsx — Three.js scene
│   │   └── main.jsx          — Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json              — Workspace config
└── README.md
```

## 🚀 Deployment

Prepared for Netlify + Railway/Render:

1. Push to GitHub
2. Frontend auto-deploys to Netlify via git hook
3. Backend runs on Railway/Render with cron jobs

## 📝 License

MIT
