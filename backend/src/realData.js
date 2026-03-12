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

export async function fetchTexasPulse() {
  console.log('🔄 Starting multi-source collection...');

  const results = await Promise.allSettled([
    collectRedditPosts(),
    collectBlueSkyPosts(),
    collectNewsArticles(),
    collectMastodonPosts(),
    collectYouTubeVideos(),
    collectTruthSocialPosts(),
    collectGoogleTrends(),
    collectThreadsPosts(),
    collectXPosts(),
  ]);

  const [
    redditPosts,
    bskyPosts,
    newsPosts,
    mastodonPosts,
    youtubePosts,
    truthPosts,
    trendPosts,
    threadsPosts,
    xPosts,
  ] = results.map(r => (r.status === 'fulfilled' ? r.value : []));

  const all = [
    ...redditPosts,
    ...bskyPosts,
    ...newsPosts,
    ...mastodonPosts,
    ...youtubePosts,
    ...truthPosts,
    ...trendPosts,
    ...threadsPosts,
    ...xPosts,
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

  console.log(
    `✅ Total: ${all.length} posts — ` +
    Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')
  );

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
