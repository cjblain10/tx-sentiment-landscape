import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// Bluesky public API — no auth required
const BASE = 'https://api.bsky.app/xrpc';

const QUERIES = [
  'Texas border immigration',
  'Texas housing rent',
  'Texas property tax',
  'Texas education schools voucher',
  'Texas healthcare medicaid',
  'ERCOT Texas power grid',
  'Texas economy jobs',
  'Texas crime fentanyl',
  'Texas election vote',
  'Texas water drought',
  'Texas gun',
  'Texas politics',
];

const DELAY_MS = 500;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchPosts(query, limit = 100) {
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `${BASE}/app.bsky.feed.searchPosts?q=${q}&limit=${limit}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.posts || [];
  } catch (err) {
    console.warn(`  ⚠ Bluesky "${query}": ${err.message}`);
    return [];
  }
}

function normalizePost(post) {
  const text = post.record?.text || '';
  if (text.length < 20) return null;

  const matchedTopics = matchTopics(text);
  if (matchedTopics.length === 0) return null;

  const sentiment   = analyzeSentiment(text);
  const region      = detectRegion(text);
  const likes       = post.likeCount || 0;
  const reposts     = post.repostCount || 0;
  const replies     = post.replyCount || 0;

  return {
    id:           `bsky_${post.cid || post.uri}`,
    source:       'bluesky',
    title:        text.substring(0, 100),
    text,
    url:          `https://bsky.app/profile/${post.author?.handle}/post/${post.uri?.split('/').pop()}`,
    author:       post.author?.handle || 'unknown',
    publishedAt:  new Date(post.indexedAt || post.record?.createdAt || Date.now()),
    engagement:   Math.max(likes + reposts + replies, 1),
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectBlueSkyPosts() {
  const seen  = new Set();
  const posts = [];

  console.log(`🔵 Bluesky: running ${QUERIES.length} searches...`);

  for (let i = 0; i < QUERIES.length; i++) {
    const raw = await searchPosts(QUERIES[i]);
    for (const post of raw) {
      const key = post.cid || post.uri;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const normalized = normalizePost(post);
      if (normalized) posts.push(normalized);
    }
    if (i < QUERIES.length - 1) await sleep(DELAY_MS);
  }

  console.log(`🔵 Bluesky: collected ${posts.length} relevant posts`);
  return posts;
}
