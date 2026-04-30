import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';
import fs from 'fs';

// X (Twitter) API v2 — Basic tier, recent search
// Runs once daily with 3 broad queries to stay under 10K reads/month cap

const X_TIMESTAMP_PATH = '/tmp/x-last-collection.json';

const SEARCH_URL = 'https://api.twitter.com/2/tweets/search/recent';

const QUERIES = [
  'Texas politics -is:retweet lang:en',
  'Texas government OR Texas legislature OR Texas governor -is:retweet lang:en',
  'ERCOT OR "Texas border" OR "Texas economy" -is:retweet lang:en',
];

const MAX_RESULTS = 100; // per query — 3 × 100 = 300 reads/day

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Shared error state — lets collectXPosts() surface errors to diagnostics
let lastError = null;

export function getXLastError() {
  return lastError;
}

async function searchTweets(query, bearerToken) {
  const params = new URLSearchParams({
    query,
    max_results: String(MAX_RESULTS),
    'tweet.fields': 'created_at,public_metrics,author_id,lang',
  });

  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json',
    },
  });

  if (res.status === 429) {
    const resetHeader = res.headers.get('x-rate-limit-reset');
    const resetAt = resetHeader ? new Date(parseInt(resetHeader) * 1000).toISOString() : 'unknown';
    throw new Error(`X API rate limited (429) — resets at ${resetAt}`);
  }

  if (res.status === 401 || res.status === 403) {
    const body = await res.text();
    throw new Error(`X API auth error (${res.status}) — bearer token may be expired or revoked. Response: ${body.slice(0, 200)}`);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.data || [];
}

function normalizePost(tweet) {
  const text = tweet.text || '';
  if (text.length < 20) return null;

  const matchedTopics = matchTopics(text);
  if (matchedTopics.length === 0) return null;

  const sentiment = analyzeSentiment(text);
  const region = detectRegion(text);
  const metrics = tweet.public_metrics || {};
  const engagement = Math.max(
    (metrics.like_count || 0) +
    (metrics.retweet_count || 0) +
    (metrics.reply_count || 0) +
    (metrics.quote_count || 0),
    1
  );

  return {
    id:           `x_${tweet.id}`,
    source:       'x',
    title:        text.substring(0, 100),
    text,
    url:          `https://x.com/i/status/${tweet.id}`,
    author:       tweet.author_id || 'unknown',
    publishedAt:  new Date(tweet.created_at || Date.now()),
    engagement,
    region,
    sentiment,
    matchedTopics,
  };
}

const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000; // 20 hours

function loadLastCollectionTime() {
  try {
    if (fs.existsSync(X_TIMESTAMP_PATH)) {
      const { ts } = JSON.parse(fs.readFileSync(X_TIMESTAMP_PATH, 'utf-8'));
      return ts || 0;
    }
  } catch (_) {}
  return 0;
}

function saveLastCollectionTime(ts) {
  try { fs.writeFileSync(X_TIMESTAMP_PATH, JSON.stringify({ ts })); } catch (_) {}
}

export async function collectXPosts() {
  const bearerToken = process.env.X_BEARER_TOKEN;
  lastError = null;

  if (!bearerToken) {
    console.log('🐦 X: skipped — no X_BEARER_TOKEN set');
    return [];
  }

  // Rate guard: stored in /tmp — resets on Render restart (by design, so we don't
  // permanently block collection after a redeploy)
  const now = Date.now();
  const lastCollectionTime = loadLastCollectionTime();
  if (lastCollectionTime && (now - lastCollectionTime) < MIN_INTERVAL_MS) {
    const hoursAgo = Math.round((now - lastCollectionTime) / 3600000);
    console.log(`🐦 X: skipped — last collection was ${hoursAgo}h ago (20h minimum)`);
    return [];
  }

  const seen = new Set();
  const posts = [];

  console.log(`🐦 X: running ${QUERIES.length} searches...`);

  try {
    for (let i = 0; i < QUERIES.length; i++) {
      const raw = await searchTweets(QUERIES[i], bearerToken);
      for (const tweet of raw) {
        if (seen.has(tweet.id)) continue;
        seen.add(tweet.id);
        const normalized = normalizePost(tweet);
        if (normalized) posts.push(normalized);
      }
      if (i < QUERIES.length - 1) await sleep(1000); // respect rate limits
    }
  } catch (err) {
    // Surface error to diagnostics — rethrow so realData.js records it in errors.x
    lastError = err.message;
    console.error(`🐦 X: ❌ ${err.message}`);
    throw err;
  }

  saveLastCollectionTime(Date.now());
  console.log(`🐦 X: collected ${posts.length} relevant posts`);
  return posts;
}
