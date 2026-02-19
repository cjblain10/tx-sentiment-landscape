import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fetchTexasPulse } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_PATH = '/tmp/tx-pulse-cache.json';

app.use(cors());
app.use(express.json());

// ── Cache: in-memory + file backup ──
let pulseCache = null;

function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
      pulseCache = JSON.parse(raw);
      console.log(`📦 Cache loaded (${pulseCache.cachedAt})`);
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

loadCache();

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cacheAge: pulseCache?.cachedAt || null,
  });
});

app.get('/api/sentiment/today', async (req, res) => {
  try {
    console.log('📡 Fetching real Texas pulse...');
    const pulse = await fetchTexasPulse();

    if (pulse && pulse.topics && pulse.topics.length > 0) {
      saveCache(pulse);
      return res.json(pulse);
    }

    // No fresh data — serve cached real data with stale flag
    if (pulseCache?.data) {
      console.log(`📦 Serving cached data from ${pulseCache.cachedAt}`);
      return res.json({ ...pulseCache.data, stale: true, cachedAt: pulseCache.cachedAt });
    }

    // Nothing at all — return an honest empty state
    return res.status(503).json({
      error: true,
      message: 'No data collected. Sources may be temporarily unavailable.',
      date: new Date().toISOString().split('T')[0],
    });

  } catch (error) {
    console.error('Error in /api/sentiment/today:', error.message);

    if (pulseCache?.data) {
      return res.json({ ...pulseCache.data, stale: true, cachedAt: pulseCache.cachedAt });
    }

    return res.status(503).json({
      error: true,
      message: error.message,
      date: new Date().toISOString().split('T')[0],
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ TX Sentinel backend on http://localhost:${PORT}`);
  console.log(`📦 Cache: ${pulseCache ? `loaded (${pulseCache.cachedAt})` : 'empty'}`);
});
