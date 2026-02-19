import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// Free RSS feeds — no API key required
const RSS_FEEDS = [
  {
    name: 'Texas Tribune',
    url:  'https://www.texastribune.org/feeds/all/',
    lean: 'center',
  },
  {
    name: 'Texas Observer',
    url:  'https://www.texasobserver.org/feed/',
    lean: 'left',
  },
  {
    name: 'Texas Standard',
    url:  'https://www.texasstandard.org/feed/',
    lean: 'center',
  },
  {
    name: 'Texas Scorecard',
    url:  'https://texasscorecard.com/feed/',
    lean: 'right',
  },
  {
    name: 'Texas Monthly',
    url:  'https://www.texasmonthly.com/feed/',
    lean: 'center',
  },
];

// Simple RSS/Atom XML parser — no dependencies
function parseRSS(xml) {
  const items = [];
  // Strip CDATA wrappers
  const clean = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c) => c.trim());

  // Match both <item> (RSS) and <entry> (Atom)
  const itemRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/g;
  let m;
  while ((m = itemRe.exec(clean)) !== null) {
    const chunk = m[1];

    const get = (tag) => {
      const tagRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const r = tagRe.exec(chunk);
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
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseRSS(xml);
  } catch (err) {
    console.warn(`  ⚠ RSS ${feed.name}: ${err.message}`);
    return [];
  }
}

function normalizeArticle(item, feed) {
  const title = item.title || '';
  const desc  = item.description || '';
  const full  = `${title} ${desc}`.trim();

  if (full.length < 30) return null;

  // Filter to Texas-relevant content
  const lowerFull = full.toLowerCase();
  const isTXRelevant = (
    lowerFull.includes('texas') ||
    lowerFull.includes('austin') ||
    lowerFull.includes('houston') ||
    lowerFull.includes('dallas') ||
    lowerFull.includes('san antonio') ||
    lowerFull.includes('ercot') ||
    lowerFull.includes('legislature') ||
    lowerFull.includes('governor abbott') ||
    lowerFull.includes('gov. abbott') ||
    lowerFull.includes('texan')
  );
  if (!isTXRelevant) return null;

  const matchedTopics = matchTopics(full);
  if (matchedTopics.length === 0) return null;

  const sentiment  = analyzeSentiment(full);
  const region     = detectRegion(full);
  const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

  return {
    id:           `news_${Buffer.from(item.link || title).toString('base64').substring(0, 32)}`,
    source:       'news',
    sourceName:   feed.name,
    title,
    text:         desc,
    url:          item.link || '',
    author:       feed.name,
    publishedAt,
    engagement:   5, // news articles get baseline weight
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectNewsArticles() {
  const seen  = new Set();
  const posts = [];

  console.log(`📰 News: fetching ${RSS_FEEDS.length} RSS feeds...`);

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

  console.log(`📰 News: collected ${posts.length} relevant articles`);
  return posts;
}
