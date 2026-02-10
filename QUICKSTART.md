# Quick Start Guide

## 🚀 Get It Running Locally

### Terminal 1: Start Backend (API Server)

```bash
cd /Users/cb/Projects/tx-sentiment-landscape
npm run dev -w backend
```

You should see:
```
✅ TX Sentiment Backend running on http://localhost:3000
📊 Try: http://localhost:3000/api/sentiment/today
```

### Terminal 2: Start Frontend (React App)

```bash
cd /Users/cb/Projects/tx-sentiment-landscape
npm run dev -w frontend
```

You should see:
```
VITE v... dev server running at:
  ➜  Local:   http://localhost:3001/
```

### Visit the App

Open **http://localhost:3001** in your browser.

You should see:
- 🌍 A 3D terrain visualization in the center
- 📊 A sidebar with 8 Texas political figures
- 💬 Sentiment scores and mention counts
- 🎮 Interactive controls (drag to rotate, scroll to zoom)

## 🧪 Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Today's sentiment data
curl http://localhost:3000/api/sentiment/today | jq

# Get 3D mesh data
curl http://localhost:3000/api/terrain/mesh | jq

# Get specific figure
curl http://localhost:3000/api/sentiment/figure/ted-cruz | jq
```

## 🎯 What You're Seeing

- **Mock Data:** All sentiment/volume numbers are deterministically generated
- **3D Terrain:** Each person is a region; height = sentiment (-1 to +1), color = volume
- **Interactive:** Click figures in sidebar to see details
- **Live Updates:** Auto-rotation if not interacting

## ✨ Next Steps

1. ✅ Backend API running with mock endpoints
2. ✅ Frontend 3D visualization working
3. ⏳ Ready to wire up real data sources (Composio, Claude, Supabase)

## 🐛 Troubleshooting

**Port 3000/3001 already in use?**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

**Dependencies failing?**
```bash
npm install --legacy-peer-deps
```

**Need to rebuild?**
```bash
npm run build
```
