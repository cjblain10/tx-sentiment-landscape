import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fetchTexasPulse } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_PATH = '/tmp/tx-pulse-cache.json';

// How often to re-collect from all sources (milliseconds)
// Default: 1 hour. Override with REFRESH_INTERVAL_MS env var.
const REFRESH_INTERVAL_MS = parseInt(process.env.REFRESH_INTERVAL_MS || '') || 60 * 60 * 1000;

app.use(cors());
app.use(express.json());

// ── Cache: in-memory + file backup ──
let pulseCache = null;
let isCollecting = false;  // guard against concurrent collection runs

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

function cacheAgeMs() {
  if (!pulseCache?.cachedAt) return Infinity;
  return Date.now() - new Date(pulseCache.cachedAt).getTime();
}

// ── Background collection ──
async function runCollection() {
  if (isCollecting) {
    console.log('⏳ Collection already in progress — skipping');
    return;
  }
  isCollecting = true;
  console.log(`🔄 Background collection started (interval: ${REFRESH_INTERVAL_MS / 60000}min)`);
  try {
    const pulse = await fetchTexasPulse();
    if (pulse && pulse.topics && pulse.topics.length > 0) {
      saveCache(pulse);
      console.log(`✅ Cache updated — ${pulse.totalVolume} posts from ${pulse.source}`);
    } else {
      console.warn('⚠️ Collection returned no data — keeping existing cache');
    }
  } catch (err) {
    console.error('❌ Background collection error:', err.message);
  } finally {
    isCollecting = false;
  }
}

// Kick off immediately on startup, then on schedule
loadCache();
runCollection();
setInterval(runCollection, REFRESH_INTERVAL_MS);

// ── Routes ──
app.get('/api/health', (req, res) => {
  const ageMs = cacheAgeMs();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cachedAt: pulseCache?.cachedAt || null,
    cacheAgeMinutes: isFinite(ageMs) ? Math.round(ageMs / 60000) : null,
    nextRefreshMinutes: isFinite(ageMs)
      ? Math.max(0, Math.round((REFRESH_INTERVAL_MS - ageMs) / 60000))
      : null,
    isCollecting,
  });
});

app.get('/api/sentiment/today', (req, res) => {
  // Always serve cached data immediately — collection happens in background
  if (pulseCache?.data) {
    const ageMs = cacheAgeMs();
    const isStale = ageMs > REFRESH_INTERVAL_MS * 2; // only flag as stale if >2x interval old
    return res.json({
      ...pulseCache.data,
      cachedAt: pulseCache.cachedAt,
      ...(isStale ? { stale: true } : {}),
    });
  }

  // No cache yet — collection just started, come back shortly
  if (isCollecting) {
    return res.status(503).json({
      error: true,
      message: 'Initial data collection in progress. Check back in 60 seconds.',
      date: new Date().toISOString().split('T')[0],
    });
  }

  return res.status(503).json({
    error: true,
    message: 'No data available. Sources may be temporarily unavailable.',
    date: new Date().toISOString().split('T')[0],
  });
});

app.listen(PORT, () => {
  console.log(`✅ TX Sentinel backend on http://localhost:${PORT}`);
  console.log(`⏱  Refresh interval: every ${REFRESH_INTERVAL_MS / 60000} minutes`);
  console.log(`📦 Cache: ${pulseCache ? `loaded (${pulseCache.cachedAt})` : 'building...'}`);
});
