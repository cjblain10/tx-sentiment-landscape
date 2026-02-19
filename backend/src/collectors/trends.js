import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// Google Trends — unofficial RSS feeds (no API key required)
// Format: trends.google.com/trends/trendingsearches/daily/rss?geo=US-TX
// Returns what Texans are searching right now — a different signal than social posts

const TRENDING_URL = 'https://trends.google.com/trending/rss?geo=US-TX';

function parseRSS(xml) {
  const items = [];
  // Strip CDATA
  const clean = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c) => c.trim());

  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(clean)) !== null) {
    const chunk = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(chunk);
      return r ? r[1].replace(/<[^>]+>/g, '').trim() : '';
    };

    const title         = get('title');
    const description   = get('description');
    const link          = get('link') || get('ht:news_item_url');
    const approxTraffic = get('ht:approx_traffic');
    const newsItems     = chunk.match(/<ht:news_item_title[^>]*>([\s\S]*?)<\/ht:news_item_title>/gi) || [];

    if (!title) continue;
    items.push({ title, description, link, approxTraffic, newsItems });
  }
  return items;
}

async function fetchTrends(url, label) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseRSS(xml);
  } catch (err) {
    console.warn(`  ⚠ Google Trends ${label}: ${err.message}`);
    return [];
  }
}

// Parse traffic string like "500K+" to a number for engagement weighting
function parseTraffic(str) {
  if (!str) return 5;
  const clean = str.replace(/[^0-9KMB]/gi, '');
  if (clean.endsWith('K')) return parseInt(clean) * 1000;
  if (clean.endsWith('M')) return parseInt(clean) * 1000000;
  return parseInt(clean) || 5;
}

function normalizeTrend(item) {
  // Combine title + description + news headlines for topic matching
  const newsText = item.newsItems
    .map(n => n.replace(/<[^>]+>/g, '').trim())
    .join(' ');
  const fullText = `${item.title} ${item.description || ''} ${newsText}`.trim();

  if (fullText.length < 10) return null;

  // Only include trends that are Texas-relevant OR match our topic keywords
  const matchedTopics = matchTopics(fullText);
  if (matchedTopics.length === 0) return null;

  const sentiment   = analyzeSentiment(fullText);
  const region      = detectRegion(fullText);
  const engagement  = Math.min(parseTraffic(item.approxTraffic), 500000); // cap for weighting

  return {
    id:          `trends_${Buffer.from(item.title.substring(0, 30)).toString('base64').substring(0, 32)}`,
    source:      'trends',
    title:       item.title,
    text:        fullText.substring(0, 300),
    url:         item.link || 'https://trends.google.com/trends?geo=US-TX',
    author:      'google_trends',
    publishedAt: new Date(),
    engagement:  Math.max(Math.floor(engagement / 10000), 5), // normalize scale
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectGoogleTrends() {
  const seen  = new Set();
  const posts = [];

  console.log(`📈 Google Trends: fetching TX trending searches...`);

  const items = await fetchTrends(TRENDING_URL, 'US-TX');
  for (const item of items) {
    const key = item.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const normalized = normalizeTrend(item);
    if (normalized) posts.push(normalized);
  }

  console.log(`📈 Google Trends: collected ${posts.length} relevant trending topics`);
  return posts;
}
