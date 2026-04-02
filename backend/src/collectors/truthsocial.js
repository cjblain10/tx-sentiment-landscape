import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// Conservative Texas news & commentary RSS feeds
// Truth Social itself blocks all API/RSS access — these sources fill the conservative voice gap:
// - Breitbart Texas: national conservative outlet with TX-focused section
// - Texas Policy Foundation: right-of-center TX think tank
// - Texas Right to Life: socially conservative TX advocacy org

const RSS_FEEDS = [
  {
    name: 'Breitbart Texas',
    url:  'https://www.breitbart.com/texas/feed/',
    lean: 'right',
  },
  {
    name: 'Texas Policy Foundation',
    url:  'https://www.texaspolicy.com/feed/',
    lean: 'right',
  },
  {
    name: 'Texas Right to Life',
    url:  'https://www.texasrighttolife.com/feed/',
    lean: 'right',
  },
  {
    name: 'Texas Scorecard',
    url:  'https://texasscorecard.com/feed/',
    lean: 'right',
  },
  {
    name: 'The Texan',
    url:  'https://thetexan.news/feed/',
    lean: 'right',
  },
];

function parseRSS(xml) {
  const items = [];
  const clean = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c) => c.trim());

  const itemRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/g;
  let m;
  while ((m = itemRe.exec(clean)) !== null) {
    const chunk = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(chunk);
      return r ? r[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const title       = get('title');
    const description = get('description') || get('summary') || get('content');
    const link        = get('link') || get('id');
    const pubDate     = get('pubDate') || get('published') || get('updated');
    if (!title && !description) continue;
    items.push({ title, description, link, pubDate });
  }
  return items;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent': 'TXPulse/2.0 (sentiment research; contact: charles@localinsights.ai)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseRSS(xml);
  } catch (err) {
    console.warn(`  ⚠ Conservative RSS ${feed.name}: ${err.message}`);
    return [];
  }
}

function normalizeArticle(item, feed) {
  const title = item.title || '';
  const desc  = item.description || '';
  const full  = `${title} ${desc}`.trim();
  if (full.length < 30) return null;

  // Filter to Texas-relevant content
  const lower = full.toLowerCase();
  const isTXRelevant = (
    lower.includes('texas') || lower.includes('austin') ||
    lower.includes('houston') || lower.includes('dallas') ||
    lower.includes('san antonio') || lower.includes('ercot') ||
    lower.includes('legislature') || lower.includes('texan') ||
    lower.includes('abbott') || lower.includes('paxton')
  );
  if (!isTXRelevant) return null;

  const matchedTopics = matchTopics(full);
  if (matchedTopics.length === 0) return null;

  const sentiment   = analyzeSentiment(full);
  const region      = detectRegion(full);
  const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

  return {
    id:          `conservnews_${Buffer.from(item.link || title).toString('base64').substring(0, 32)}`,
    source:      'conservativenews',
    sourceName:  feed.name,
    title,
    text:        desc,
    url:         item.link || '',
    author:      feed.name,
    publishedAt,
    engagement:  5,
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectTruthSocialPosts() {
  const seen  = new Set();
  const posts = [];

  console.log(`🦅 Conservative TX news: fetching ${RSS_FEEDS.length} feeds...`);

  for (const feed of RSS_FEEDS) {
    const items = await fetchFeed(feed);
    for (const item of items) {
      const key = item.link || item.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const normalized = normalizeArticle(item, feed);
      if (normalized) posts.push(normalized);
    }
  }

  console.log(`🦅 Conservative TX news: collected ${posts.length} relevant articles`);
  return posts;
}
