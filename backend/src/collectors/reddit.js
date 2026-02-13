// Same keywords as Devvit bot and frontend
const MONITORED_KEYWORDS = [
  'border security',
  'energy & grid',
  'power grid',
  'ercot',
  'education',
  'schools',
  'teachers',
  'healthcare',
  'hospital',
  'medicaid',
  'economy & jobs',
  'employment',
  'unemployment',
  'abortion',
  'gun policy',
  'second amendment',
  'water & drought',
  'water rights',
  'crime & safety',
  'police',
  'elections',
  'voting',
  'housing',
  'rent',
  'property tax',
  'property taxes'
];

const MONITORED_SUBREDDITS = [
  'texas',
  'houston',
  'austin',
  'dallas',
  'sanantonio',
  'politics',
  'conservative',
  'liberal'
];

/**
 * Fetch posts from Reddit's public JSON API via old.reddit.com (more permissive)
 */
async function fetchSubredditPosts(subreddit, limit = 100) {
  try {
    // Use old.reddit.com which has looser restrictions
    const url = `https://old.reddit.com/r/${subreddit}/new.json?limit=${limit}&raw_json=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data.children.map(child => child.data);
  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error.message);
    return [];
  }
}

// Helper to add delay between requests (rate limiting)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simple sentiment analysis (-1 to +1)
 */
function analyzeSentiment(text) {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'better', 'improve', 'growth', 'success'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'worse', 'decline', 'fail', 'crisis', 'problem', 'disaster'];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score += matches.length;
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score -= matches.length;
  });

  const wordCount = text.split(/\s+/).length;
  const normalized = score / Math.max(wordCount / 100, 1);
  return Math.max(-1, Math.min(1, normalized));
}

/**
 * Check if text matches monitored keywords
 */
function matchesKeywords(text) {
  const lowerText = text.toLowerCase();
  return MONITORED_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * Map keywords to categories
 */
function categorizeTopic(keywords) {
  const categoryMap = {
    'Cost of Living': ['housing', 'rent', 'property tax', 'property taxes'],
    'Economy': ['economy & jobs', 'employment', 'unemployment', 'power grid', 'ercot', 'energy & grid'],
    'Health Care': ['healthcare', 'hospital', 'medicaid'],
    'Education': ['education', 'schools', 'teachers']
  };

  for (const [category, categoryKeywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => categoryKeywords.includes(kw))) {
      return category;
    }
  }

  return null;
}

/**
 * Collect posts from Reddit using public JSON API (no auth required)
 */
async function collectRedditPosts() {
  const allPosts = [];
  console.log('Starting Reddit collection (public API, no auth)...');

  for (let i = 0; i < MONITORED_SUBREDDITS.length; i++) {
    const subredditName = MONITORED_SUBREDDITS[i];

    try {
      console.log(`Fetching from r/${subredditName}...`);

      const posts = await fetchSubredditPosts(subredditName, 100);
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      for (const post of posts) {
        const createdAt = post.created_utc * 1000;

        // Only posts from last 24 hours
        if (createdAt < oneDayAgo) continue;

        const fullText = `${post.title} ${post.selftext || ''}`;
        const matchedKeywords = matchesKeywords(fullText);

        if (matchedKeywords.length > 0) {
          const sentiment = analyzeSentiment(fullText);
          const category = categorizeTopic(matchedKeywords);

          allPosts.push({
            id: post.id,
            subreddit: subredditName,
            author: post.author || '[deleted]',
            title: post.title,
            text: post.selftext || '',
            url: `https://reddit.com${post.permalink}`,
            score: post.score,
            numComments: post.num_comments,
            createdAt: new Date(createdAt),
            sentiment,
            matchedKeywords,
            category,
            source: 'reddit'
          });

          console.log(`  ✓ Collected: "${post.title.substring(0, 50)}..." (${matchedKeywords.join(', ')}) - Sentiment: ${sentiment.toFixed(2)}`);
        }
      }

      // Rate limiting: wait 1 second between subreddit requests
      if (i < MONITORED_SUBREDDITS.length - 1) {
        await sleep(1000);
      }
    } catch (error) {
      console.error(`Error fetching r/${subredditName}:`, error.message);
    }
  }

  console.log(`Reddit collection complete. Collected ${allPosts.length} posts.`);
  return allPosts;
}

/**
 * Transform Reddit posts into sentiment API format
 */
function transformToSentimentData(posts) {
  const totalVolume = posts.length;

  // Group by category
  const categoryGroups = {
    'Cost of Living': [],
    'Economy': [],
    'Health Care': [],
    'Education': []
  };

  posts.forEach(post => {
    if (post.category && categoryGroups[post.category]) {
      categoryGroups[post.category].push(post);
    }
  });

  // Calculate category stats
  const categories = Object.entries(categoryGroups).map(([name, categoryPosts]) => {
    const volume = categoryPosts.length;
    const sentiment = volume > 0
      ? categoryPosts.reduce((sum, p) => sum + p.sentiment, 0) / volume
      : 0;

    return {
      name,
      sentiment: Math.round(sentiment * 100) / 100,
      volume,
      delta: 0, // TODO: Calculate from previous day
      topics: [...new Set(categoryPosts.flatMap(p => p.matchedKeywords))]
    };
  });

  // Calculate overall score (weighted by volume)
  const totalWeight = posts.reduce((sum, p) => sum + (p.score + p.numComments), 0);
  const weightedSum = posts.reduce((sum, p) => sum + (p.sentiment * (p.score + p.numComments)), 0);
  const overallScore = totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : 0;

  // Get biggest movers (top 5 by engagement)
  const biggestMovers = posts
    .sort((a, b) => (b.score + b.numComments) - (a.score + a.numComments))
    .slice(0, 5)
    .map(post => ({
      name: post.matchedKeywords[0] || 'general',
      sentiment: post.sentiment,
      delta: 0, // TODO: Calculate from previous
      volume: post.score + post.numComments
    }));

  // Group by topic for topic list
  const topicGroups = {};
  posts.forEach(post => {
    post.matchedKeywords.forEach(keyword => {
      if (!topicGroups[keyword]) {
        topicGroups[keyword] = [];
      }
      topicGroups[keyword].push(post);
    });
  });

  const topics = Object.entries(topicGroups).map(([name, topicPosts]) => {
    const volume = topicPosts.length;
    const sentiment = topicPosts.reduce((sum, p) => sum + p.sentiment, 0) / volume;

    return {
      name,
      sentiment: Math.round(sentiment * 100) / 100,
      volume,
      topMentions: topicPosts
        .sort((a, b) => (b.score + b.numComments) - (a.score + a.numComments))
        .slice(0, 3)
        .map(p => ({
          text: p.title,
          sentiment: p.sentiment,
          source: 'reddit',
          region: null
        }))
    };
  }).sort((a, b) => b.volume - a.volume);

  return {
    date: new Date().toISOString().split('T')[0],
    source: 'reddit',
    overallScore,
    scoreDelta: 0, // TODO: Calculate from previous day
    totalVolume,
    categories,
    biggestMovers,
    topics,
    regions: {
      'gulf-coast': 'Houston / Gulf Coast',
      'north-texas': 'Dallas-Fort Worth',
      'central-texas': 'Austin / Central TX',
      'south-texas': 'San Antonio / South TX',
      'west-texas': 'West Texas',
      'east-texas': 'East Texas'
    }
  };
}

export {
  collectRedditPosts,
  transformToSentimentData
};
