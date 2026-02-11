import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { getDailySentimentData, getHistoricalSentimentData } from './mockData.js';
import { fetchTexasPulse } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_PATH = '/tmp/tx-pulse-cache.json';

app.use(cors());
app.use(express.json());

// ── In-memory cache with file backup ──
let pulseCache = null;

function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
      pulseCache = JSON.parse(raw);
      console.log(`📦 Cache loaded from disk (${pulseCache.cachedAt})`);
    }
  } catch (e) {
    console.warn('⚠️ Could not load cache:', e.message);
  }
}

function saveCache(data) {
  pulseCache = { data, cachedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(pulseCache));
  } catch (e) {
    console.warn('⚠️ Could not write cache:', e.message);
  }
}

// Load any existing cache on startup
loadCache();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cacheAge: pulseCache ? pulseCache.cachedAt : null,
  });
});

// Get today's sentiment — dynamic topics + regional breakdowns
app.get('/api/sentiment/today', async (req, res) => {
  try {
    if (process.env.USE_MOCK !== 'true') {
      console.log('📡 Fetching real Texas pulse...');
      const pulse = await fetchTexasPulse();
      if (pulse && pulse.topics && pulse.topics.length > 0) {
        // Fresh real data — cache it and serve
        saveCache(pulse);
        return res.json(pulse);
      }
      console.log('⚠️ Real data empty, checking cache...');
    }

    // Fallback 1: Serve cached real data with stale flag
    if (pulseCache && pulseCache.data) {
      console.log(`📦 Serving cached data from ${pulseCache.cachedAt}`);
      return res.json({
        ...pulseCache.data,
        stale: true,
        cachedAt: pulseCache.cachedAt,
      });
    }

    // Fallback 2: No cache available — demo data
    console.log('📊 No cache available, using demo data');
    res.json(getDailySentimentData());
  } catch (error) {
    console.error('Error:', error.message);

    // Even on error, try cache first
    if (pulseCache && pulseCache.data) {
      console.log(`📦 Error recovery: serving cached data from ${pulseCache.cachedAt}`);
      return res.json({
        ...pulseCache.data,
        stale: true,
        cachedAt: pulseCache.cachedAt,
      });
    }

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
  console.log(`📦 Cache: ${pulseCache ? `loaded (${pulseCache.cachedAt})` : 'empty'}`);
});
