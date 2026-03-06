import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fetchTexasPulse } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_PATH   = '/tmp/tx-pulse-cache.json';
const HISTORY_PATH = '/tmp/tx-pulse-history.json';

const REFRESH_INTERVAL_MS = parseInt(process.env.REFRESH_INTERVAL_MS || '') || 2 * 60 * 60 * 1000;
const MAX_HISTORY = 360; // 12 runs/day × 30 days

app.use(cors());
app.use(express.json());

// ── Upstash Redis (persistent history across restarts/redeploys) ──
// Falls back to /tmp files when env vars not set (local dev, first deploy)
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('🔴 Upstash Redis connected — history will persist across restarts');
  } catch (e) {
    console.warn('⚠️ Upstash Redis init failed:', e.message, '— falling back to /tmp');
  }
} else {
  console.warn('⚠️ UPSTASH_REDIS_REST_URL/TOKEN not set — history stored in /tmp (lost on restart)');
}

// ── State ──
let pulseCache = null;
let pulseHistory = [];
let isCollecting = false;

// ── Cache (current snapshot) ──
function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      pulseCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      console.log(`📦 Cache loaded (${pulseCache.cachedAt})`);
    }
  } catch (e) {
    console.warn('⚠️ Could not load cache:', e.message);
  }
}

function saveCache(data) {
  pulseCache = { data, cachedAt: new Date().toISOString() };
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(pulseCache)); } catch (_) {}
}

// ── History (persistent via Upstash, /tmp fallback) ──
async function loadHistory() {
  if (redis) {
    try {
      const stored = await redis.get('tx-pulse-history');
      if (stored) {
        pulseHistory = Array.isArray(stored) ? stored : JSON.parse(stored);
        console.log(`📈 History loaded from Upstash — ${pulseHistory.length} snapshots`);
        return;
      }
    } catch (e) {
      console.warn('⚠️ Upstash history load failed:', e.message);
    }
  }
  // File fallback
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      pulseHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      console.log(`📈 History loaded from /tmp — ${pulseHistory.length} snapshots`);
    }
  } catch (e) {
    console.warn('⚠️ Could not load history from file:', e.message);
  }
}

async function saveHistory() {
  if (pulseHistory.length > MAX_HISTORY) {
    pulseHistory = pulseHistory.slice(pulseHistory.length - MAX_HISTORY);
  }

  if (redis) {
    try {
      await redis.set('tx-pulse-history', JSON.stringify(pulseHistory));
    } catch (e) {
      console.warn('⚠️ Upstash history save failed:', e.message);
    }
  }
  // Always mirror to /tmp as a local safety copy
  try { fs.writeFileSync(HISTORY_PATH, JSON.stringify(pulseHistory)); } catch (_) {}
}

function appendSnapshot(data) {
  const snapshot = {
    date:         new Date().toISOString(),
    overallScore: data.overallScore,
    totalVolume:  data.totalVolume,
    source:       data.source,
    categories:   data.categories.map(c => ({ name: c.name, sentiment: c.sentiment, volume: c.volume })),
    topics:       data.topics.slice(0, 20).map(t => ({ name: t.name, sentiment: t.sentiment, volume: t.volume })),
  };
  pulseHistory.push(snapshot);
}

function cacheAgeMs() {
  if (!pulseCache?.cachedAt) return Infinity;
  return Date.now() - new Date(pulseCache.cachedAt).getTime();
}

// ── Background collection ──
async function runCollection() {
  if (isCollecting) { console.log('⏳ Collection in progress — skipping'); return; }
  isCollecting = true;
  console.log(`🔄 Collection started (interval: ${REFRESH_INTERVAL_MS / 60000}min)`);
  try {
    const pulse = await fetchTexasPulse();
    if (pulse && pulse.topics && pulse.topics.length > 0) {
      // Calculate deltas vs previous snapshot
      if (pulseHistory.length > 0) {
        const prev = pulseHistory[pulseHistory.length - 1];
        pulse.scoreDelta = Math.round((pulse.overallScore - prev.overallScore) * 1000) / 1000;
        if (prev.categories) {
          pulse.categories = pulse.categories.map(cat => {
            const prevCat = prev.categories.find(c => c.name === cat.name);
            return { ...cat, delta: prevCat ? Math.round((cat.sentiment - prevCat.sentiment) * 1000) / 1000 : 0 };
          });
        }
        if (prev.topics) {
          pulse.biggestMovers = pulse.biggestMovers.map(mover => {
            const prevTopic = prev.topics.find(t => t.name === mover.name);
            return { ...mover, delta: prevTopic ? Math.round((mover.sentiment - prevTopic.sentiment) * 1000) / 1000 : 0 };
          });
        }
      }
      saveCache(pulse);
      appendSnapshot(pulse);
      await saveHistory();
      console.log(`✅ Cache updated — ${pulse.totalVolume} posts from ${pulse.source} (${pulseHistory.length} snapshots stored)`);
    } else {
      console.warn('⚠️ No data returned — keeping existing cache');
    }
  } catch (err) {
    console.error('❌ Collection error:', err.message);
  } finally {
    isCollecting = false;
  }
}

// ── Startup ──
loadCache();
await loadHistory();
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
    nextRefreshMinutes: isFinite(ageMs) ? Math.max(0, Math.round((REFRESH_INTERVAL_MS - ageMs) / 60000)) : null,
    isCollecting,
    historySnapshots: pulseHistory.length,
    historyBackend: redis ? 'upstash' : 'tmp-file',
  });
});

app.get('/api/sentiment/history', (req, res) => {
  const days = Math.min(parseInt(req.query.days || '30'), 90);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = pulseHistory.filter(s => new Date(s.date).getTime() >= cutoff);
  res.json(filtered);
});

// ── Keep-alive ping (self-ping every 14 min to prevent Render free tier sleep) ──
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
setInterval(() => {
  fetch(`${SELF_URL}/api/health`).catch(() => {});
}, 14 * 60 * 1000);

// ── Ticker embed (CORS-open, 5-min CDN cache) ──
app.get('/api/sentiment/ticker', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (!pulseCache?.data) {
    return res.status(503).json({ error: true, message: 'No data available yet.' });
  }

  const d = pulseCache.data;
  const fmt = (s) => ((s * 10) >= 0 ? '+' : '') + (s * 10).toFixed(1);
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
    historyDays: pulseHistory.length,
    embedUrl: 'https://sentiment.localinsights.ai',
  });
});

app.get('/api/sentiment/today', (req, res) => {
  if (pulseCache?.data) {
    const ageMs = cacheAgeMs();
    const isStale = ageMs > REFRESH_INTERVAL_MS * 2;
    return res.json({
      ...pulseCache.data,
      cachedAt: pulseCache.cachedAt,
      ...(isStale ? { stale: true } : {}),
    });
  }
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
  console.log(`⏱  Refresh: every ${REFRESH_INTERVAL_MS / 60000}min`);
  console.log(`📦 Cache: ${pulseCache ? `loaded (${pulseCache.cachedAt})` : 'building...'}`);
  console.log(`📈 History backend: ${redis ? 'Upstash Redis' : '/tmp file (ephemeral)'}`);
});
