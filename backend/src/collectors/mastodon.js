import { analyzeSentiment, matchTopics, detectRegion } from './shared.js';

// Mastodon public hashtag timeline — no auth required
const BASE = 'https://mastodon.social/api/v1/timelines/tag';

const HASHTAGS = [
  'texas',
  'TexasPolitics',
  'TXpolitics',
  'Houston',
  'Austin',
  'Dallas',
  'ERCOT',
  'TexasBorder',
  'TexasEducation',
  'TexasHousing',
];

const DELAY_MS = 400;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Strip HTML tags from Mastodon content
function stripHTML(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHashtag(tag) {
  try {
    const res = await fetch(
      `${BASE}/${encodeURIComponent(tag)}?limit=40&only_media=false`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`  ⚠ Mastodon #${tag}: ${err.message}`);
    return [];
  }
}

function normalizeStatus(status) {
  if (!status.content) return null;
  if (status.reblog) return null; // skip reposts

  const text = stripHTML(status.content);
  if (text.length < 20) return null;

  // Filter to English only
  if (status.language && status.language !== 'en') return null;

  const matchedTopics = matchTopics(text);
  if (matchedTopics.length === 0) return null;

  const sentiment = analyzeSentiment(text);
  const region    = detectRegion(text);
  const favs      = status.favourites_count || 0;
  const reblogs   = status.reblogs_count || 0;

  return {
    id:           `mastodon_${status.id}`,
    source:       'mastodon',
    title:        text.substring(0, 120),
    text,
    url:          status.url || '',
    author:       status.account?.acct || 'unknown',
    publishedAt:  new Date(status.created_at),
    engagement:   Math.max(favs + reblogs, 1),
    region,
    sentiment,
    matchedTopics,
  };
}

export async function collectMastodonPosts() {
  const seen  = new Set();
  const posts = [];

  console.log(`🦣 Mastodon: fetching ${HASHTAGS.length} hashtag timelines...`);

  for (let i = 0; i < HASHTAGS.length; i++) {
    const statuses = await fetchHashtag(HASHTAGS[i]);
    for (const status of statuses) {
      if (seen.has(status.id)) continue;
      seen.add(status.id);
      const normalized = normalizeStatus(status);
      if (normalized) posts.push(normalized);
    }
    if (i < HASHTAGS.length - 1) await sleep(DELAY_MS);
  }

  console.log(`🦣 Mastodon: collected ${posts.length} relevant posts`);
  return posts;
}
