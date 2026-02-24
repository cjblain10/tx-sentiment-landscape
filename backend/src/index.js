import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fetchTexasPulse } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_PATH   = '/tmp/tx-pulse-cache.json';
const HISTORY_PATH = '/tmp/tx-pulse-history.json';

// How often to re-collect from all sources (milliseconds)
// Default: 2 hours. Override with REFRESH_INTERVAL_MS env var.
const REFRESH_INTERVAL_MS = parseInt(process.env.REFRESH_INTERVAL_MS || '') || 2 * 60 * 60 * 1000;

// Keep up to 30 days of snapshots (12 runs/day × 30 = 360 max)
const MAX_HISTORY = 360;

app.use(cors());
app.use(express.json());

// ── Cache: in-memory + file backup ──
let pulseCache = null;
let pulseHistory = [];   // rolling array of snapshots
let isCollecting = false;

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

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
      pulseHistory = JSON.parse(raw);
      console.log(`📈 History loaded — ${pulseHistory.length} snapshots`);
    }
  } catch (e) {
    console.warn('⚠️ Could not load history:', e.message);
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

function appendHistory(data) {
  const snapshot = {
    date:        new Date().toISOString(),
    overallScore: data.overallScore,
    totalVolume:  data.totalVolume,
    source:       data.source,
    categories:   data.categories.map(c => ({ name: c.name, sentiment: c.sentiment, volume: c.volume })),
    topics:       data.topics.slice(0, 20).map(t => ({ name: t.name, sentiment: t.sentiment, volume: t.volume })),
  };
  pulseHistory.push(snapshot);
  if (pulseHistory.length > MAX_HISTORY) {
    pulseHistory = pulseHistory.slice(pulseHistory.length - MAX_HISTORY);
  }
  try {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(pulseHistory));
  } catch (e) {
    console.warn('⚠️ Could not write history:', e.message);
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
      appendHistory(pulse);
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
loadHistory();
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
    historySnapshots: pulseHistory.length,
  });
});

app.get('/api/sentiment/history', (req, res) => {
  const days = Math.min(parseInt(req.query.days || '30'), 30);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = pulseHistory.filter(s => new Date(s.date).getTime() >= cutoff);
  res.json(filtered);
});

// ── Ticker embed endpoint (lightweight, CORS-open for LSS embed) ──
app.get('/api/sentiment/ticker', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5-min CDN cache

  if (!pulseCache?.data) {
    return res.status(503).json({ error: true, message: 'No data available yet.' });
  }

  const d = pulseCache.data;
  const fmt = (s) => ((s * 10) >= 0 ? '+' : '') + (s * 10).toFixed(1);

  // Top mover by absolute delta
  const topMover = d.biggestMovers?.[0] || null;

  res.json({
    overall: {
      score: fmt(d.overallScore),
      rawScore: parseFloat((d.overallScore * 10).toFixed(1)),
      delta: d.scoreDelta ? fmt(d.scoreDelta) : '0.0',
      label: 'Texas Sentiment',
    },
    categories: (d.categories || []).map(c => ({
      name: c.name,
      score: fmt(c.sentiment),
      rawScore: parseFloat((c.sentiment * 10).toFixed(1)),
      delta: c.delta ? fmt(c.delta) : '0.0',
      volume: c.volume,
    })),
    topMover: topMover ? {
      name: topMover.name,
      score: fmt(topMover.sentiment),
      delta: topMover.delta ? fmt(topMover.delta) : '0.0',
    } : null,
    date: d.date,
    updatedAt: pulseCache.cachedAt,
    sources: 8,
    embedUrl: 'https://sentiment.localinsights.ai',
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
