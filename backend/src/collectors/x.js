import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// X (Twitter) API v2 — Basic tier, recent search
// Runs once daily with 3 broad queries to stay under 10K reads/month cap

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

async function searchTweets(query, bearerToken) {
  try {
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
      console.warn('  ⚠ X API rate limited (429) — skipping this run');
      return [];
    }

    if (res.status === 401 || res.status === 403) {
      const body = await res.text();
      console.error(`  ❌ X API auth failed (${res.status}): ${body.slice(0, 300)}`);
      console.error('  ❌ Bearer token may be expired or revoked. Check X Developer Portal.');
      throw new Error(`X API auth error ${res.status} — token may be invalid`);
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`  ❌ X API error (${res.status}): ${body.slice(0, 300)}`);
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn(`  ⚠ X search "${query.slice(0, 40)}...": ${err.message}`);
    return [];
  }
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

// Track last collection time — only run once per 20 hours to stay under cap
let lastCollectionTime = 0;
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000; // 20 hours

export async function collectXPosts() {
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    console.log('🐦 X: skipped — no X_BEARER_TOKEN set');
    return [];
  }

  // Rate guard: only collect once per ~20 hours
  const now = Date.now();
  if (lastCollectionTime && (now - lastCollectionTime) < MIN_INTERVAL_MS) {
    console.log('🐦 X: skipped — last collection was less than 20 hours ago');
    return [];
  }

  const seen = new Set();
  const posts = [];

  console.log(`🐦 X: running ${QUERIES.length} searches...`);

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

  lastCollectionTime = Date.now();
  console.log(`🐦 X: collected ${posts.length} relevant posts`);
  return posts;
}
