import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// YouTube Data API v3 — requires YOUTUBE_API_KEY env var
// Free tier: 10,000 units/day. Search = 100 units. Video list = 1 unit.
// 10,000 units ÷ 100 = 100 searches/day free.
// Get a free key: https://console.cloud.google.com → Enable YouTube Data API v3

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE    = 'https://www.googleapis.com/youtube/v3';

const SEARCH_QUERIES = [
  'Texas politics 2026',
  'Texas border immigration',
  'Texas education schools voucher',
  'Texas housing rent property tax',
  'ERCOT Texas energy grid',
  'Texas economy jobs',
  'Texas crime fentanyl cartel',
  'Texas legislature session',
];

const DELAY_MS = 300;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchVideos(query) {
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '25',
      relevanceLanguage: 'en',
      regionCode: 'US',
      publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      key: API_KEY,
    });
    const res = await fetch(`${BASE}/search?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn(`  ⚠ YouTube "${query}": ${err.message}`);
    return [];
  }
}

function normalizeVideo(item) {
  const snippet = item.snippet;
  if (!snippet) return null;

  const title       = snippet.title || '';
  const description = (snippet.description || '').substring(0, 500);
  const channelName = snippet.channelTitle || '';
  const full        = `${title} ${description}`.trim();

  if (full.length < 20) return null;

  // Filter to Texas-relevant content
  const lowerFull = full.toLowerCase();
  const isTXRelevant = (
    lowerFull.includes('texas') ||
    lowerFull.includes('austin') ||
    lowerFull.includes('houston') ||
    lowerFull.includes('dallas') ||
    lowerFull.includes('ercot') ||
    lowerFull.includes('texan') ||
    lowerFull.includes('lone star')
  );
  if (!isTXRelevant) return null;

  const matchedTopics = matchTopics(full);
  if (matchedTopics.length === 0) return null;

  const sentiment    = analyzeSentiment(full);
  const region       = detectRegion(full);
  const videoId      = item.id?.videoId || '';
  const publishedAt  = snippet.publishedAt ? new Date(snippet.publishedAt) : new Date();

  return {
    id:           `youtube_${videoId}`,
    source:       'youtube',
    title,
    text:         description,
    url:          `https://www.youtube.com/watch?v=${videoId}`,
    author:       channelName,
    publishedAt,
    engagement:   10, // baseline weight; video = higher signal than a tweet
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectYouTubeVideos() {
  if (!API_KEY) {
    console.log('📺 YouTube: no API key (YOUTUBE_API_KEY not set) — skipping');
    return [];
  }

  const seen  = new Set();
  const posts = [];

  console.log(`📺 YouTube: running ${SEARCH_QUERIES.length} searches...`);

  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const items = await searchVideos(SEARCH_QUERIES[i]);
    for (const item of items) {
      const id = item.id?.videoId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const normalized = normalizeVideo(item);
      if (normalized) posts.push(normalized);
    }
    if (i < SEARCH_QUERIES.length - 1) await sleep(DELAY_MS);
  }

  console.log(`📺 YouTube: collected ${posts.length} relevant videos`);
  return posts;
}
