import { collectRedditPosts }   from './collectors/reddit.js';
import { collectBlueSkyPosts }  from './collectors/bluesky.js';
import { collectNewsArticles }  from './collectors/news.js';
import { buildResponse }        from './collectors/shared.js';

export async function fetchTexasPulse() {
  console.log('🔄 Starting multi-source collection...');

  // Run all collectors in parallel
  const [redditPosts, bskyPosts, newsPosts] = await Promise.allSettled([
    collectRedditPosts(),
    collectBlueSkyPosts(),
    collectNewsArticles(),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])));

  const all = [...redditPosts, ...bskyPosts, ...newsPosts];
  console.log(`✅ Total: ${all.length} posts (Reddit: ${redditPosts.length}, Bluesky: ${bskyPosts.length}, News: ${newsPosts.length})`);

  if (all.length === 0) {
    console.warn('⚠️ No posts collected from any source');
    return null;
  }

  const sourceLabel = [
    redditPosts.length > 0 ? 'reddit' : null,
    bskyPosts.length  > 0 ? 'bluesky' : null,
    newsPosts.length  > 0 ? 'news' : null,
  ].filter(Boolean).join('+');

  return buildResponse(all, sourceLabel);
}
