import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// YouTube Data API v3 — requires YOUTUBE_API_KEY env var
// Unit cost: search = 100 units, commentThreads = 1 unit per video
// Free tier 10,000 units/day: 8 searches (800) + ~150 comment fetches (150) = ~950/day
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
  'Texas Scorecard',
];

const DELAY_MS = 300;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Step 1: Find recent Texas political videos
async function searchVideos(query) {
  try {
    const params = new URLSearchParams({
      part: 'id',
      q: query,
      type: 'video',
      maxResults: '20',
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
    return (data.items || []).map(item => item.id?.videoId).filter(Boolean);
  } catch (err) {
    console.warn(`  ⚠ YouTube search "${query}": ${err.message}`);
    return [];
  }
}

// Step 2: Fetch top comments for a video (1 unit per call)
async function fetchComments(videoId) {
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      videoId,
      maxResults: '50',
      order: 'relevance',
      textFormat: 'plainText',
      key: API_KEY,
    });
    const res = await fetch(`${BASE}/commentThreads?${params}`);
    if (!res.ok) return []; // comments may be disabled on some videos
    const data = await res.json();
    return (data.items || []).map(item => ({
      text: item.snippet?.topLevelComment?.snippet?.textDisplay || '',
      likes: item.snippet?.topLevelComment?.snippet?.likeCount || 0,
    }));
  } catch {
    return [];
  }
}

function normalizeComment(comment, videoId) {
  const text = comment.text?.trim() || '';
  if (text.length < 15) return null;

  const matchedTopics = matchTopics(text);
  if (matchedTopics.length === 0) return null;

  const sentiment = analyzeSentiment(text);
  const region    = detectRegion(text);

  return {
    id:           `yt_comment_${videoId}_${Buffer.from(text.substring(0, 20)).toString('base64')}`,
    source:       'youtube',
    title:        text.substring(0, 120),
    text,
    url:          `https://www.youtube.com/watch?v=${videoId}`,
    author:       'youtube_viewer',
    publishedAt:  new Date(),
    engagement:   Math.max(comment.likes, 1),
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectYouTubeVideos() {
  if (!API_KEY) {
    console.log('📺 YouTube: no YOUTUBE_API_KEY — skipping');
    return [];
  }

  const seenVideos   = new Set();
  const seenComments = new Set();
  const posts        = [];

  console.log(`📺 YouTube: searching ${SEARCH_QUERIES.length} queries for video IDs...`);

  // Collect unique video IDs
  const videoIds = [];
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const ids = await searchVideos(SEARCH_QUERIES[i]);
    for (const id of ids) {
      if (!seenVideos.has(id)) { seenVideos.add(id); videoIds.push(id); }
    }
    if (i < SEARCH_QUERIES.length - 1) await sleep(DELAY_MS);
  }

  console.log(`📺 YouTube: fetching comments from ${videoIds.length} videos...`);

  // Fetch comments for each video
  for (let i = 0; i < videoIds.length; i++) {
    const comments = await fetchComments(videoIds[i]);
    for (const comment of comments) {
      const key = comment.text.substring(0, 40);
      if (seenComments.has(key)) continue;
      seenComments.add(key);
      const normalized = normalizeComment(comment, videoIds[i]);
      if (normalized) posts.push(normalized);
    }
    if (i < videoIds.length - 1) await sleep(200);
  }

  console.log(`📺 YouTube: collected ${posts.length} relevant comments`);
  return posts;
}
