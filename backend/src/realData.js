// Real-time Texas sentiment — dynamic topic discovery + region tagging

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'ak_cdwQZVwTOel5YxPz9BgL';
const COMPOSIO_BASE_URL = 'https://api.composio.dev/v1';

// ── Broad topic dictionary — only topics with actual matches surface ──
const TOPIC_SEEDS = {
  'border security': ['border', 'wall', 'immigration', 'migrant', 'crossing', 'deportation', 'ice', 'cbp', 'asylum'],
  'energy & grid': ['ercot', 'grid', 'power outage', 'energy', 'electricity', 'blackout', 'solar', 'wind farm', 'oil', 'natural gas', 'pipeline'],
  'education': ['school', 'education', 'teacher', 'voucher', 'curriculum', 'student', 'university', 'tuition', 'isd'],
  'healthcare': ['healthcare', 'medicaid', 'hospital', 'insurance', 'clinic', 'mental health', 'drug price', 'pharmaceutical'],
  'economy & jobs': ['economy', 'jobs', 'unemployment', 'inflation', 'housing market', 'wage', 'business', 'recession'],
  'abortion': ['abortion', 'reproductive', 'roe', 'planned parenthood', 'pro-life', 'pro-choice'],
  'gun policy': ['gun', 'firearm', 'shooting', 'second amendment', '2a', 'nra', 'open carry'],
  'water & drought': ['water', 'drought', 'flood', 'reservoir', 'aquifer', 'water supply', 'water rights'],
  'crime & safety': ['crime', 'police', 'prison', 'arrest', 'murder', 'fentanyl', 'cartel', 'gang'],
  'elections': ['vote', 'election', 'ballot', 'primary', 'campaign', 'polling', 'runoff', 'voter'],
  'housing': ['housing', 'homeless', 'rent', 'mortgage', 'affordable housing', 'zoning', 'eviction'],
  'transportation': ['highway', 'i-35', 'traffic', 'transit', 'txdot', 'toll road', 'high speed rail'],
  'property tax': ['property tax', 'appraisal', 'homestead', 'tax relief', 'tax rate'],
  'tech & innovation': ['tech', 'ai', 'startup', 'spacex', 'tesla', 'semiconductor', 'data center'],
};

// ── TX regions ──
const TX_REGIONS = {
  'gulf-coast': ['houston', 'galveston', 'beaumont', 'pasadena', 'sugar land', 'woodlands', 'katy', 'baytown', 'pearland', 'league city', 'port arthur', 'corpus christi', 'htx', 'htown'],
  'north-texas': ['dallas', 'fort worth', 'plano', 'arlington', 'denton', 'frisco', 'mckinney', 'garland', 'irving', 'dfw', 'richardson'],
  'central-texas': ['austin', 'waco', 'san marcos', 'round rock', 'temple', 'killeen', 'georgetown', 'pflugerville', 'atx'],
  'south-texas': ['san antonio', 'laredo', 'mcallen', 'brownsville', 'harlingen', 'rgv', 'rio grande', 'edinburg', 'satx'],
  'west-texas': ['el paso', 'midland', 'odessa', 'lubbock', 'amarillo', 'abilene', 'san angelo'],
  'east-texas': ['tyler', 'longview', 'nacogdoches', 'lufkin', 'texarkana', 'marshall', 'etx'],
};

const REGION_LABELS = {
  'gulf-coast': 'Houston / Gulf Coast',
  'north-texas': 'Dallas-Fort Worth',
  'central-texas': 'Austin / Central TX',
  'south-texas': 'San Antonio / South TX',
  'west-texas': 'West Texas',
  'east-texas': 'East Texas',
};

// ── Sentiment keywords ──
const POS_WORDS = ['great', 'good', 'excellent', 'strong', 'positive', 'support', 'success', 'win', 'approve', 'progress', 'reform', 'boost', 'improve', 'protect', 'secure', 'benefit', 'growth'];
const NEG_WORDS = ['bad', 'poor', 'failed', 'weak', 'negative', 'crisis', 'disaster', 'corrupt', 'scandal', 'oppose', 'reject', 'waste', 'broken', 'dangerous', 'threat', 'attack', 'fear', 'decline'];

// ── Twitter search — issue-focused, no politician names ──
async function searchTexasWide(maxResults = 100) {
  // Build query from actual issue keywords
  const issueTerms = [
    'Texas border', 'Texas energy', 'ERCOT', 'Texas education', 'Texas healthcare',
    'Texas housing', 'Texas crime', 'Texas abortion', 'Texas gun', 'Texas water',
    'Texas drought', 'Texas election', 'Texas property tax', 'Texas transportation',
  ];
  const query = issueTerms.join(' OR ');
  console.log('📡 Searching Texas issues...');

  try {
    const response = await fetch(`${COMPOSIO_BASE_URL}/actions/twitter/search_tweets`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${COMPOSIO_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        max_results: Math.min(maxResults, 100),
        tweet_fields: 'author_id,created_at,public_metrics',
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Composio ${response.status}, trying fallback...`);
      return await fallbackSearch(maxResults);
    }

    const data = await response.json();
    console.log(`✅ Got ${data.data?.length || 0} tweets`);
    return data;
  } catch (err) {
    console.error(`❌ Search error: ${err.message}`);
    return await fallbackSearch(maxResults);
  }
}

async function fallbackSearch(maxResults = 100) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    console.warn('⚠️ No bearer token — returning null (will use demo)');
    return null;
  }

  try {
    const q = encodeURIComponent('Texas border OR Texas energy OR ERCOT OR Texas education OR Texas healthcare OR Texas crime lang:en');
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${q}&max_results=${maxResults}&tweet_fields=author_id,created_at,public_metrics`,
      { headers: { 'Authorization': `Bearer ${bearerToken}` } }
    );
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.error(`Fallback failed: ${err.message}`);
    return null;
  }
}

// ── Tag a tweet with topics + region ──
function tagTweet(text) {
  const lower = text.toLowerCase();

  // Topics
  const topics = [];
  for (const [topic, keywords] of Object.entries(TOPIC_SEEDS)) {
    const matches = keywords.filter(k => lower.includes(k));
    if (matches.length > 0) topics.push(topic);
  }

  // Region
  let region = null;
  for (const [regionId, cities] of Object.entries(TX_REGIONS)) {
    if (cities.some(c => lower.includes(c))) { region = regionId; break; }
  }

  // Sentiment
  const posHits = POS_WORDS.filter(w => lower.includes(w)).length;
  const negHits = NEG_WORDS.filter(w => lower.includes(w)).length;
  const sentiment = (posHits - negHits) / (posHits + negHits || 1);

  return { text, topics, region, sentiment: Math.max(-1, Math.min(1, sentiment)) };
}

// ── Build topic-based response from tagged tweets ──
function buildTopicResponse(taggedTweets, date) {
  const topicMap = {};

  for (const tw of taggedTweets) {
    for (const topicName of tw.topics) {
      if (!topicMap[topicName]) {
        topicMap[topicName] = { name: topicName, sentiments: [], volumes: 0, mentions: [], byRegion: {} };
      }
      const t = topicMap[topicName];
      t.sentiments.push(tw.sentiment);
      t.volumes++;
      if (t.mentions.length < 6) {
        t.mentions.push({ text: tw.text, sentiment: tw.sentiment, source: 'twitter', region: tw.region });
      }

      // Region breakdown
      const reg = tw.region || '_statewide';
      if (!t.byRegion[reg]) t.byRegion[reg] = { sentiments: [], volume: 0 };
      t.byRegion[reg].sentiments.push(tw.sentiment);
      t.byRegion[reg].volume++;
    }
  }

  // Convert to final shape — only topics with 1+ tweets
  const topics = Object.values(topicMap)
    .map(t => {
      const avgSentiment = t.sentiments.reduce((a, b) => a + b, 0) / t.sentiments.length;
      const byRegion = {};
      for (const [reg, rd] of Object.entries(t.byRegion)) {
        if (reg === '_statewide') continue;
        byRegion[reg] = {
          sentiment: rd.sentiments.reduce((a, b) => a + b, 0) / rd.sentiments.length,
          volume: rd.volume,
        };
      }
      return {
        name: t.name,
        sentiment: Math.round(avgSentiment * 100) / 100,
        volume: t.volumes,
        byRegion,
        topMentions: t.mentions,
      };
    })
    .sort((a, b) => b.volume - a.volume);

  return {
    date,
    source: 'twitter',
    totalVolume: taggedTweets.length,
    regions: REGION_LABELS,
    topics,
  };
}

// ── Public: fetch + process ──
async function fetchTexasPulse() {
  const twitterData = await searchTexasWide(100);

  if (!twitterData || !twitterData.data || twitterData.data.length === 0) {
    return null; // caller falls back to demo
  }

  const tagged = twitterData.data.map(t => tagTweet(t.text));
  const date = new Date().toISOString().split('T')[0];
  return buildTopicResponse(tagged, date);
}

export { fetchTexasPulse, TOPIC_SEEDS, TX_REGIONS, REGION_LABELS, tagTweet, buildTopicResponse };
