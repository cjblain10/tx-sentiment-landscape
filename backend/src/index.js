import express from 'express';
import cors from 'cors';
import { getDailySentimentData, getHistoricalSentimentData } from './mockData.js';
import { fetchTexasPulse } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get today's sentiment — dynamic topics + regional breakdowns
app.get('/api/sentiment/today', async (req, res) => {
  try {
    if (process.env.USE_MOCK !== 'true') {
      console.log('📡 Fetching real Texas pulse...');
      const pulse = await fetchTexasPulse();
      if (pulse && pulse.topics && pulse.topics.length > 0) {
        return res.json(pulse);
      }
      console.log('⚠️ Real data empty, falling back to demo');
    }

    console.log('📊 Using demo data');
    res.json(getDailySentimentData());
  } catch (error) {
    console.error('Error:', error.message);
    res.json(getDailySentimentData());
  }
});

// Historical data for trend sparklines
app.get('/api/sentiment/history', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  res.json(getHistoricalSentimentData(days));
});

app.listen(PORT, () => {
  console.log(`✅ TX Sentiment Backend running on http://localhost:${PORT}`);
  console.log(`📊 Try: http://localhost:${PORT}/api/sentiment/today`);
});
