import express from 'express';
import cors from 'cors';
import { getDailySentimentData, getHistoricalSentimentData, generateTerrainMesh, FIGURES } from './mockData.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get today's sentiment data
app.get('/api/sentiment/today', (req, res) => {
  const data = getDailySentimentData();
  res.json(data);
});

// Get historical data for timeline
app.get('/api/sentiment/history', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const data = getHistoricalSentimentData(days);
  res.json(data);
});

// Get 3D terrain mesh data
app.get('/api/terrain/mesh', (req, res) => {
  const mesh = generateTerrainMesh();
  res.json(mesh);
});

// Get figure metadata
app.get('/api/figures', (req, res) => {
  res.json(FIGURES);
});

// Get sentiment for specific figure
app.get('/api/sentiment/figure/:figureId', (req, res) => {
  const data = getDailySentimentData();
  const figure = data.figures.find(f => f.id === req.params.figureId);

  if (!figure) {
    return res.status(404).json({ error: 'Figure not found' });
  }

  res.json(figure);
});

app.listen(PORT, () => {
  console.log(`✅ TX Sentiment Backend running on http://localhost:${PORT}`);
  console.log(`📊 Try: http://localhost:${PORT}/api/sentiment/today`);
});
