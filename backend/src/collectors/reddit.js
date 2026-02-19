import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// ── Subreddits to browse (hot posts) ──
const TX_SUBREDDITS = [
  'texas', 'houston', 'austin', 'dallas', 'sanantonio',
  'ElPaso', 'TexasPolitics', 'texaspolitics',
  'Conservative', 'Republican',
];

// ── Keyword search queries (run against Reddit search) ──
const SEARCH_QUERIES = [
  'Texas border immigration',
  'Texas housing rent property tax',
  'Texas education school voucher',
  'Texas healthcare medicaid',
  'ERCOT Texas energy grid',
  'Texas economy jobs inflation',
  'Texas crime police fentanyl',
  'Texas election vote primary',
  'Texas water drought flood',
  'Texas gun second amendment',
];

const UA = 'TXPulse/2.0 (sentiment research; contact: charles@localinsights.ai)';
const DELAY_MS = 800;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Fetch hot/top posts from a subreddit
async function fetchSubredditHot(subreddit) {
  try {
    const data = await fetchJSON(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=100&raw_json=1`
    );
    return (data.data?.children || []).map(c => c.data);
  } catch (err) {
    console.warn(`  ⚠ r/${subreddit} hot: ${err.message}`);
    return [];
  }
}

// Search Reddit for a keyword query (past week, sorted by relevance)
async function searchReddit(query) {
  try {
    const q = encodeURIComponent(query);
    const data = await fetchJSON(
      `https://www.reddit.com/search.json?q=${q}&sort=new&t=week&limit=100&raw_json=1`
    );
    return (data.data?.children || []).map(c => c.data);
  } catch (err) {
    console.warn(`  ⚠ search "${query}": ${err.message}`);
    return [];
  }
}

function normalizePost(post, defaultSource = 'reddit') {
  const title = post.title || '';
  const body  = post.selftext || '';
  const full  = `${title} ${body}`.trim();

  const matchedTopics = matchTopics(full);
  if (matchedTopics.length === 0) return null;

  const sentiment = analyzeSentiment(full);
  const region    = detectRegion(full) || detectRegion(post.subreddit_name_prefixed || '');

  return {
    id:            `reddit_${post.id}`,
    source:        defaultSource,
    title,
    text:          body,
    url:           `https://reddit.com${post.permalink}`,
    author:        post.author || '[deleted]',
    publishedAt:   new Date((post.created_utc || 0) * 1000),
    engagement:    Math.max((post.score || 0) + (post.num_comments || 0), 1),
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectRedditPosts() {
  const seen  = new Set();
  const posts = [];
  const cutoff = Date.now() - 72 * 60 * 60 * 1000; // 72 hours

  console.log('🟠 Reddit: browsing hot posts from TX subreddits...');
  for (let i = 0; i < TX_SUBREDDITS.length; i++) {
    const sub = TX_SUBREDDITS[i];
    const raw = await fetchSubredditHot(sub);
    for (const post of raw) {
      if (seen.has(post.id)) continue;
      if ((post.created_utc || 0) * 1000 < cutoff) continue;
      seen.add(post.id);
      const normalized = normalizePost(post);
      if (normalized) posts.push(normalized);
    }
    if (i < TX_SUBREDDITS.length - 1) await sleep(DELAY_MS);
  }

  console.log(`🟠 Reddit: running ${SEARCH_QUERIES.length} keyword searches...`);
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const raw = await searchReddit(SEARCH_QUERIES[i]);
    for (const post of raw) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      const normalized = normalizePost(post);
      if (normalized) posts.push(normalized);
    }
    await sleep(DELAY_MS);
  }

  console.log(`🟠 Reddit: collected ${posts.length} relevant posts`);
  return posts;
}
