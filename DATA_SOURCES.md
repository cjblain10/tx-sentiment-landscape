# TX Sentiment Tracker - Data Sources Research

## Current Status

**Active:** None (Composio Twitter OAuth revoked by X)
**Cached:** Last successful Twitter pull (serving stale-but-real data)
**Fallback:** Demo data (deterministic mock)

---

## Recommended Data Sources (Free Tier Available)

### 1. Reddit API ⭐ **RECOMMENDED - FREE**

**Endpoints:**
- `/r/texas` - General Texas discussion (~500K members)
- `/r/TexasPolitics` - Political sentiment (~50K members)
- `/r/houston`, `/r/dallas`, `/r/austin` - Regional breakdowns

**Pros:**
- **Free** via official Reddit API (no authentication for read-only)
- High-quality discussions (less spam than Twitter)
- Built-in sentiment indicators (upvotes/downvotes, comment tone)
- Subreddit structure = natural categorization
- JSON API, easy to parse

**Cons:**
- Smaller volume than Twitter
- Skews younger/tech-savvy
- May miss mainstream voices

**Implementation:**
```javascript
// Example: Fetch top posts from r/texas
fetch('https://www.reddit.com/r/texas/top.json?t=day&limit=100')
  .then(r => r.json())
  .then(data => {
    const posts = data.data.children.map(p => ({
      title: p.data.title,
      score: p.data.score,
      comments: p.data.num_comments,
      text: p.data.selftext,
    }));
    // Sentiment analysis on posts + comments
  });
```

**Cost:** $0
**Setup time:** 1-2 hours
**Monthly volume estimate:** 5,000-10,000 posts/comments per day

---

### 2. Bluesky API ⭐ **RECOMMENDED - FREE**

**Endpoints:**
- AT Protocol public firehose
- `app.bsky.feed.searchPosts` - Keyword search

**Pros:**
- **Free** public API (no rate limits on firehose)
- Growing user base (especially post-X exodus)
- Open protocol, well-documented
- Real-time stream available
- Less toxic than Twitter

**Cons:**
- Smaller user base than Twitter
- Still ramping up adoption in Texas
- Requires AT Protocol client library

**Implementation:**
```javascript
import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({ service: 'https://bsky.social' });
await agent.login({ identifier: 'user', password: 'pass' }); // or public access

const { data } = await agent.app.bsky.feed.searchPosts({
  q: 'texas politics',
  limit: 100,
});
// Process posts for sentiment
```

**Cost:** $0
**Setup time:** 2-3 hours
**Monthly volume estimate:** 1,000-3,000 posts per day

---

### 3. News Sentiment APIs

#### NewsCatcher API
- **Free tier:** 1,000 requests/month
- **Pros:** Pre-categorized news articles, sentiment scores included
- **Cons:** Limited free tier, may miss social sentiment
- **URL:** https://newscatcherapi.com

#### GNews API
- **Free tier:** 100 requests/day
- **Pros:** Real-time news articles, Texas-specific filtering
- **Cons:** No sentiment analysis (need to add)
- **URL:** https://gnews.io

#### NewsAPI.org
- **Free tier:** 100 requests/day, 1-month archive
- **Pros:** Simple API, good coverage
- **Cons:** Requires attribution
- **URL:** https://newsapi.org

**Recommendation:** NewsAPI.org for free tier, then add sentiment analysis via local NLP

---

### 4. Mastodon Instances (Texas-Focused)

**Endpoints:**
- `https://texasobs.social/api/v1/timelines/public` - Texas Observer instance
- `https://mastodon.social/api/v1/timelines/tag/texas` - Hashtag search

**Pros:**
- **Free** public API
- Growing post-Twitter migration
- Federated = multiple instances to pull from
- Open-source, well-documented

**Cons:**
- Fragmented user base across instances
- Lower volume than centralized platforms
- Need to aggregate multiple instances

**Cost:** $0
**Setup time:** 2-3 hours
**Monthly volume estimate:** 500-2,000 posts per day

---

### 5. YouTube Comment Sentiment (Via YouTube Data API)

**Endpoints:**
- Search for Texas news channels/politics videos
- Pull comments for sentiment analysis

**Pros:**
- Free tier: 10,000 units/day (enough for ~100 video comment threads)
- Long-form sentiment (comments often more detailed)
- Video metadata = topic categorization

**Cons:**
- Requires Google Cloud project + API key
- Comments can be low-quality/spam
- Not real-time (video release lag)

**Cost:** $0 (free tier)
**Setup time:** 3-4 hours
**Monthly volume estimate:** 2,000-5,000 comments per day

---

### 6. Government/Polling Data Feeds (Structural Data, Not Sentiment)

**Sources:**
- **Texas Legislature API:** Bill tracking, vote records (no sentiment, but proxy via partisan votes)
- **Texas Tribune Data:** Public datasets on state politics
- **Gallup/Pew Research:** Occasional Texas polling (manual integration)

**Pros:**
- High-quality, authoritative data
- Direct measurement of policy outcomes
- Non-partisan

**Cons:**
- Not real-time social sentiment
- Requires manual updates (no live API for most)
- Polling data is sparse/episodic

**Cost:** $0
**Setup time:** 4-6 hours (manual data pipeline)

---

## Recommended Hybrid Approach

### Phase 1 (Immediate - 1 week)
1. **Reddit API** - Primary source (free, high-quality, easy setup)
2. **Bluesky API** - Secondary source (growing platform, free)
3. Combine both into single sentiment pipeline

**Expected volume:** 6,000-13,000 posts/day
**Cost:** $0

### Phase 2 (1-2 months)
4. Add **NewsAPI.org** for news article sentiment (supplement social)
5. Add **Mastodon** (texasobs.social) for political commentary

**Expected volume:** +2,000 posts/day
**Cost:** $0

### Phase 3 (Future)
6. YouTube comments (if volume justifies setup)
7. Paid Twitter API tier ($100/mo for Basic) **only if client budget supports**

---

## Sentiment Analysis Options

Since we're moving away from Composio's pre-packaged sentiment, we'll need our own:

### Option A: **Hugging Face Transformers (Free, Local)**
- Model: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- Runs locally or serverless (no cost)
- Accurate for social media text
- **Recommended**

### Option B: **Google Cloud Natural Language API**
- Free tier: 5,000 requests/month
- Paid: $1/1,000 requests after free tier
- Higher quality, but costs scale

### Option C: **OpenAI GPT-4 Sentiment**
- Most accurate, but expensive ($0.03/1K tokens)
- Only if client budget supports

**Recommendation:** Option A (Hugging Face) for free sentiment analysis

---

## Implementation Priority

1. ✅ **Week 1:** Reddit API integration (r/texas, r/TexasPolitics, regional subs)
2. **Week 2:** Bluesky API integration
3. **Week 3:** Hugging Face sentiment model deployment
4. **Week 4:** NewsAPI integration (optional)

**Total cost:** $0/month
**Expected daily volume:** 6,000-15,000 posts/comments

---

## Next Steps

1. Set up Reddit API client (no auth needed for public reads)
2. Build sentiment pipeline with Hugging Face model
3. Deploy to Render backend (free tier supports this)
4. Test with 24-hour data pull
5. Switch from demo data to Reddit data on frontend

**ETA for live Reddit data:** 5-7 days (if prioritized)
