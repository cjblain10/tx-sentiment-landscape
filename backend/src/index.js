import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fetchTexasPulse, collectorDiagnostics } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_PATH   = '/tmp/tx-pulse-cache.json';
const HISTORY_PATH = '/tmp/tx-pulse-history.json';

const REFRESH_INTERVAL_MS = parseInt(process.env.REFRESH_INTERVAL_MS || '') || 2 * 60 * 60 * 1000;
const MAX_HISTORY = 360; // 12 runs/day × 30 days

app.use(cors());
app.use(express.json());

// ── API Key Authentication ──
const API_KEYS = {
  data:  process.env.API_KEY_DATA  || 'txs_data_94313aabf9fcea306befa72ef4419075',
  embed: process.env.API_KEY_EMBED || 'txs_embed_089e6a982d263fcc4d90c525fd0a1c33',
};

function extractKey(req) {
  // Check Authorization header first, then query param
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return req.query.key || null;
}

function requireKey(...allowedTypes) {
  return (req, res, next) => {
    const key = extractKey(req);
    if (!key) {
      return res.status(401).json({ error: true, message: 'API key required. Pass via ?key= or Authorization: Bearer header.' });
    }
    const valid = allowedTypes.some(type => key === API_KEYS[type]);
    if (!valid) {
      return res.status(403).json({ error: true, message: 'Invalid API key.' });
    }
    req.apiKeyType = allowedTypes.find(type => key === API_KEYS[type]);
    next();
  };
}

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
        pulse.scoreDelta = pulse.overallScore - prev.overallScore;
        if (prev.categories) {
          pulse.categories = pulse.categories.map(cat => {
            const prevCat = prev.categories.find(c => c.name === cat.name);
            return { ...cat, delta: prevCat ? cat.sentiment - prevCat.sentiment : 0 };
          });
        }
        if (prev.topics) {
          pulse.biggestMovers = pulse.biggestMovers.map(mover => {
            const prevTopic = prev.topics.find(t => t.name === mover.name);
            return { ...mover, delta: prevTopic ? mover.sentiment - prevTopic.sentiment : 0 };
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

app.get('/api/sentiment/history', requireKey('data', 'embed'), (req, res) => {
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

// ── Label map matching sentiment site's TOP_ISSUES + OTHER_ISSUES (same order) ──
const TICKER_ISSUES = [
  { key: 'healthcare', label: 'Health Care' },
  { key: 'education', label: 'Education' },
  { key: 'economy & jobs', label: 'Economy' },
  { key: 'cost of living', label: 'Cost of Living' },
  { key: 'property tax', label: 'Property Taxes' },
  { key: 'energy & grid', label: 'Energy' },
  { key: 'government accountability', label: 'Government Accountability' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'water & drought', label: 'Water' },
  { key: 'tech & innovation', label: 'Tech & Innovation' },
  { key: 'ai data centers', label: 'AI Data Centers' },
  { key: 'border security', label: 'Border Security' },
  { key: 'crime & safety', label: 'Crime & Safety' },
  { key: 'local control', label: 'Local Control' },
  { key: 'housing', label: 'Housing' },
  { key: 'thc & hemp', label: 'THC & Hemp' },
  { key: 'casinos & gambling', label: 'Casinos & Gambling' },
  { key: 'nuclear energy', label: 'Nuclear Energy' },
  { key: 'recycling', label: 'Recycling' },
  { key: 'public information', label: 'Public Info & Transparency' },
];

// ── Ticker embed (CORS-open, 5-min CDN cache) ──
app.get('/api/sentiment/ticker', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (!pulseCache?.data) {
    return res.status(503).json({ error: true, message: 'No data available yet.' });
  }

  const d = pulseCache.data;
  const topicMap = {};
  (d.topics || []).forEach(t => { topicMap[t.name] = t; });

  const fmtScore = (s) => `${Math.round(s)}/100`;
  const fmtDelta = (v) => v ? `${v > 0 ? '+' : ''}${Math.round(v)}` : '0';
  const topMover = d.biggestMovers?.[0] || null;

  // Keep categories aligned with the live sentiment ticker issue order/labels.
  const categories = TICKER_ISSUES
    .map(issue => {
      const t = topicMap[issue.key];
      if (!t || t.volume === 0) return null;
      return {
        name: issue.label,
        score: fmtScore(t.sentiment),
        rawScore: Math.round(t.sentiment),
        delta: fmtDelta(t.delta),
        volume: t.volume,
      };
    })
    .filter(Boolean);

  res.json({
    overall: {
      score: fmtScore(d.overallScore),
      rawScore: Math.round(d.overallScore),
      delta: fmtDelta(d.scoreDelta),
      label: 'Texas Sentiment',
      scale: '0-100',
    },
    categories,
    topics: (d.topics || []).map(t => ({
      name: t.name,
      score: fmtScore(t.sentiment),
      rawScore: Math.round(t.sentiment),
      delta: fmtDelta(t.delta),
      volume: t.volume,
    })),
    topMover: topMover ? {
      name: topMover.name,
      score: fmtScore(topMover.sentiment),
      delta: fmtDelta(topMover.delta),
    } : null,
    date: d.date,
    updatedAt: pulseCache.cachedAt,
    sources: collectorDiagnostics.activeSources || 8,
    historyDays: pulseHistory.length,
    embedUrl: 'https://sentiment.localinsights.ai',
  });
});

// ── Public sentiment endpoint for Squarespace ticker ──
app.get('/api/sentiment', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  if (!pulseCache?.data) {
    return res.status(503).json({ error: true, message: 'No data available yet.' });
  }

  const d = pulseCache.data;
  const topicMap = {};
  (d.topics || []).forEach(t => { topicMap[t.name] = t; });

  const fmtDelta = (v) => v ? `${v > 0 ? '+' : ''}${Math.round(v)}` : '0';

  // Use same labels, order, and scores as the sentiment site ticker
  const categories = TICKER_ISSUES
    .map(issue => {
      const t = topicMap[issue.key];
      if (!t || t.volume === 0) return null;
      return {
        name: issue.label,
        score: Math.round(t.sentiment),
        rawScore: Math.round(t.sentiment),
        delta: fmtDelta(t.delta),
      };
    })
    .filter(Boolean);

  res.json({
    overall: {
      name: 'OVERALL',
      score: Math.round(d.overallScore),
      rawScore: Math.round(d.overallScore),
      delta: fmtDelta(d.scoreDelta),
    },
    categories,
  });
});

app.get('/api/sentiment/today', requireKey('data', 'embed'), (req, res) => {
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

// ── Embed endpoint (serves a framed dashboard for external sites) ──
app.get('/api/embed', requireKey('embed'), (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.send(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;overflow:hidden}iframe{width:100%;height:100vh;border:none}</style>
</head><body>
<iframe src="https://sentiment.localinsights.ai" allow="fullscreen"></iframe>
</body></html>`);
});

// ── Key info endpoint (for admins to verify keys work) ──
app.get('/api/key/verify', (req, res) => {
  const key = extractKey(req);
  if (!key) return res.status(401).json({ valid: false, message: 'No key provided.' });

  if (key === API_KEYS.data) {
    return res.json({ valid: true, type: 'data', access: ['sentiment/today', 'sentiment/history', 'sentiment/ticker', 'health'] });
  }
  if (key === API_KEYS.embed) {
    return res.json({ valid: true, type: 'embed', access: ['sentiment/today', 'sentiment/history', 'embed'] });
  }
  return res.status(403).json({ valid: false, message: 'Invalid key.' });
});

// ── Manual refresh trigger (external cron backup) ──
app.post('/api/refresh', requireKey('data'), async (req, res) => {
  if (isCollecting) {
    return res.json({ status: 'already_collecting', cachedAt: pulseCache?.cachedAt || null });
  }
  res.json({ status: 'triggered', message: 'Collection started' });
  runCollection(); // fire and forget
});

// ── Diagnostics (per-source counts, errors, env check) ──
app.get('/api/diagnostics', requireKey('data'), (req, res) => {
  res.json({
    ...collectorDiagnostics,
    historySnapshots: pulseHistory.length,
    currentSource: pulseCache?.data?.source || null,
    xCollectorNote: !process.env.X_BEARER_TOKEN
      ? 'X_BEARER_TOKEN env var is NOT set — X collector will always skip'
      : 'X_BEARER_TOKEN is set — check errors field if X count is 0',
  });
});

app.listen(PORT, () => {
  console.log(`✅ TX Sentinel backend on http://localhost:${PORT}`);
  console.log(`⏱  Refresh: every ${REFRESH_INTERVAL_MS / 60000}min`);
  console.log(`📦 Cache: ${pulseCache ? `loaded (${pulseCache.cachedAt})` : 'building...'}`);
  console.log(`📈 History backend: ${redis ? 'Upstash Redis' : '/tmp file (ephemeral)'}`);
});
