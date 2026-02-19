import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// Local Texas broadcast news RSS feeds
// Threads API requires OAuth auth — these local TV stations fill the ground-level
// community news gap: what's happening at the city and neighborhood level across TX.
// All feeds are public, no auth required.

const RSS_FEEDS = [
  {
    name: 'KHOU 11 Houston',
    url:  'https://www.khou.com/feeds/syndication/rss/news/',
    region: 'gulf-coast',
  },
  {
    name: 'KVUE Austin',
    url:  'https://www.kvue.com/feeds/syndication/rss/news/',
    region: 'central-texas',
  },
  {
    name: 'WFAA Dallas',
    url:  'https://www.wfaa.com/feeds/syndication/rss/news/',
    region: 'north-texas',
  },
  {
    name: 'KENS 5 San Antonio',
    url:  'https://www.kens5.com/feeds/syndication/rss/news/',
    region: 'south-texas',
  },
  {
    name: 'KXAN Austin',
    url:  'https://www.kxan.com/feed/',
    region: 'central-texas',
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
    const description = get('description') || get('summary');
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
    console.warn(`  ⚠ Local TV RSS ${feed.name}: ${err.message}`);
    return [];
  }
}

function normalizeArticle(item, feed) {
  const title = item.title || '';
  const desc  = item.description || '';
  const full  = `${title} ${desc}`.trim();
  if (full.length < 30) return null;

  // Local TX TV news is already geographically TX — still filter by topic relevance
  const matchedTopics = matchTopics(full);
  if (matchedTopics.length === 0) return null;

  const sentiment   = analyzeSentiment(full);
  // Use the feed's known region, fall back to text detection
  const region      = feed.region || detectRegion(full);
  const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

  return {
    id:          `localtv_${Buffer.from(item.link || title).toString('base64').substring(0, 32)}`,
    source:      'localnews',
    sourceName:  feed.name,
    title,
    text:        desc,
    url:         item.link || '',
    author:      feed.name,
    publishedAt,
    engagement:  6,  // local TV news gets slightly higher baseline (broad reach)
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectThreadsPosts() {
  const seen  = new Set();
  const posts = [];

  console.log(`📺 Local TX TV news: fetching ${RSS_FEEDS.length} station feeds...`);

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

  console.log(`📺 Local TX TV news: collected ${posts.length} relevant stories`);
  return posts;
}
