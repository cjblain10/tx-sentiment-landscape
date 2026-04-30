import { collectRedditPosts }       from './collectors/reddit.js';
import { collectBlueSkyPosts }      from './collectors/bluesky.js';
import { collectNewsArticles }      from './collectors/news.js';
import { collectMastodonPosts }     from './collectors/mastodon.js';
import { collectYouTubeVideos }     from './collectors/youtube.js';
import { collectTruthSocialPosts }  from './collectors/truthsocial.js';
import { collectGoogleTrends }      from './collectors/trends.js';
import { collectThreadsPosts }      from './collectors/threads.js';
import { collectXPosts }            from './collectors/x.js';
import { buildResponse }            from './collectors/shared.js';

// ── Diagnostics state (exported for /api/diagnostics) ──
export const collectorDiagnostics = {
  lastRun: null,
  counts: {},
  errors: {},
  activeSources: 0,
  envCheck: {},
};

const COLLECTOR_NAMES = [
  'reddit', 'bluesky', 'news', 'mastodon',
  'youtube', 'conservativenews', 'trends', 'localnews', 'x',
];

export async function fetchTexasPulse() {
  console.log('🔄 Starting multi-source collection...');

  // Check env vars relevant to collectors
  collectorDiagnostics.envCheck = {
    X_BEARER_TOKEN: !!process.env.X_BEARER_TOKEN,
    YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
    NEWSAPI_KEY: !!process.env.NEWSAPI_KEY,
    REDDIT_CLIENT_ID: !!process.env.REDDIT_CLIENT_ID,
  };
  // Reset xCollectorNote each run
  delete collectorDiagnostics.xCollectorNote;

  const collectors = [
    collectRedditPosts(),
    collectBlueSkyPosts(),
    collectNewsArticles(),
    collectMastodonPosts(),
    collectYouTubeVideos(),
    collectTruthSocialPosts(),
    collectGoogleTrends(),
    collectThreadsPosts(),
    collectXPosts(),
  ];

  const results = await Promise.allSettled(collectors);

  // Track errors per source
  const errors = {};
  const arrays = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    errors[COLLECTOR_NAMES[i]] = r.reason?.message || String(r.reason);
    console.error(`❌ ${COLLECTOR_NAMES[i]} collector failed:`, r.reason?.message);
    return [];
  });

  const [
    redditPosts, bskyPosts, newsPosts, mastodonPosts,
    youtubePosts, truthPosts, trendPosts, threadsPosts, xPosts,
  ] = arrays;

  const all = [
    ...redditPosts, ...bskyPosts, ...newsPosts, ...mastodonPosts,
    ...youtubePosts, ...truthPosts, ...trendPosts, ...threadsPosts, ...xPosts,
  ];

  const counts = {
    reddit:          redditPosts.length,
    bluesky:         bskyPosts.length,
    news:            newsPosts.length,
    mastodon:        mastodonPosts.length,
    youtube:         youtubePosts.length,
    conservativenews: truthPosts.length,
    trends:          trendPosts.length,
    localnews:       threadsPosts.length,
    x:               xPosts.length,
  };

  // Update diagnostics
  collectorDiagnostics.lastRun = new Date().toISOString();
  collectorDiagnostics.counts = counts;
  collectorDiagnostics.errors = errors;
  collectorDiagnostics.activeSources = Object.values(counts).filter(v => v > 0).length;

  console.log(
    `✅ Total: ${all.length} posts — ` +
    Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')
  );

  if (Object.keys(errors).length > 0) {
    console.warn(`⚠️ Collector errors: ${Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join('; ')}`);
  }

  if (all.length === 0) {
    console.warn('⚠️ No posts collected from any source');
    return null;
  }

  const sourceLabel = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k]) => k)
    .join('+');

  return buildResponse(all, sourceLabel);
}
