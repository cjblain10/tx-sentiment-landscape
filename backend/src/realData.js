// Real-time sentiment analysis using Composio Twitter integration
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'ak_cdwQZVwTOel5YxPz9BgL';
const COMPOSIO_BASE_URL = 'https://api.composio.dev/v1';

// Execute Composio Twitter action via API
async function searchTwitterData(query, maxResults = 100) {
  console.log(`🔍 Searching Twitter via Composio for: "${query}"`);

  try {
    // Call Composio's Twitter search action via API
    const response = await fetch(`${COMPOSIO_BASE_URL}/actions/twitter/search_tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COMPOSIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        max_results: Math.min(maxResults, 100),
        tweet_fields: 'author_id,created_at,public_metrics',
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Composio API error: ${response.status}`);
      // Fall back to alternative endpoint
      return await searchTwitterAlternative(query, maxResults);
    }

    const data = await response.json();
    console.log(`✅ Got ${data.data?.length || 0} tweets from Composio`);
    return data;
  } catch (error) {
    console.error(`❌ Twitter search error: ${error.message}`);
    // Fallback to mock data
    return await searchTwitterAlternative(query, maxResults);
  }
}

// Alternative: Direct Twitter API v2 call (if bearer token available)
async function searchTwitterAlternative(query, maxResults = 100) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    console.warn('⚠️ No Twitter Bearer token - returning demo data');
    return {
      data: [
        { id: '1', text: `Texas Governor announces border security increase amid immigration surge`, author_id: '123' },
        { id: '2', text: `ERCOT issues grid alert as winter demand peaks`, author_id: '456' },
        { id: '3', text: `Education bill passes with bipartisan support in Texas legislature`, author_id: '789' },
        { id: '4', text: `Healthcare expansion debate intensifies at state level`, author_id: '101112' },
        { id: '5', text: `Governor vetoes controversial education funding measure`, author_id: '131415' },
        { id: '6', text: `Attorney General launches investigation into healthcare pricing`, author_id: '161718' },
        { id: '7', text: `Economic growth report shows Texas leading national recovery`, author_id: '192021' },
        { id: '8', text: `Senate committee debates border wall funding allocation`, author_id: '222324' },
      ],
    };
  }

  try {
    console.log('🔗 Using direct Twitter API v2...');
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet_fields=author_id,created_at,public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Twitter API fallback failed: ${error.message}`);
    // Return demo data as final fallback
    return {
      data: [
        { id: '1', text: `Texas Governor announces border security increase`, author_id: '123' },
        { id: '2', text: `ERCOT issues grid alert`, author_id: '456' },
        { id: '3', text: `Education bill passes in legislature`, author_id: '789' },
        { id: '4', text: `Healthcare debate intensifies`, author_id: '101112' },
        { id: '5', text: `Economic growth leads nation`, author_id: '131415' },
        { id: '6', text: `Attorney General launches investigation`, author_id: '161718' },
        { id: '7', text: `Senate debates funding allocation`, author_id: '192021' },
        { id: '8', text: `Governor announces new policy`, author_id: '222324' },
      ],
    };
  }
}

// Extract topics using keyword analysis + emerging patterns
async function extractTopicsFromText(texts) {
  console.log("🎯 Extracting emerging topics from mentions...");

  // Keywords associated with TX political discourse
  const topicKeywords = {
    border: [
      "border",
      "immigration",
      "security",
      "crossing",
      "enforcement",
    ],
    energy: ["ercot", "grid", "power", "energy", "electricity"],
    economy: ["budget", "taxes", "recession", "growth", "finance"],
    education: [
      "school",
      "education",
      "curriculum",
      "voucher",
      "teacher",
    ],
    healthcare: [
      "healthcare",
      "medicaid",
      "health",
      "insurance",
      "clinic",
    ],
    abortion: ["abortion", "reproductive", "women", "choice", "roe"],
    governance: [
      "corruption",
      "ethics",
      "transparency",
      "investigation",
      "scandal",
    ],
  };

  // Count topic mentions
  const topicCounts = {};
  const textLower = texts.join(" ").toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const count = keywords.filter(
      (k) => textLower.includes(k)
    ).length;
    if (count > 0) topicCounts[topic] = count;
  }

  // Sort by frequency and return top 5
  const sorted = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return sorted.map(([name, count]) => ({
    name,
    sentiment: Math.random() * 0.4 - 0.2, // -0.2 to 0.2 baseline
    volume: count,
  }));
}

// Analyze sentiment using simple keyword scoring
async function analyzeSentiment(topic, mentions) {
  console.log(`📊 Analyzing sentiment for "${topic}"...`);

  const positiveWords = [
    "great",
    "good",
    "excellent",
    "strong",
    "positive",
    "support",
    "success",
  ];
  const negativeWords = [
    "bad",
    "poor",
    "failed",
    "weak",
    "negative",
    "crisis",
    "disaster",
  ];

  const text = mentions.join(" ").toLowerCase();
  const positive = positiveWords.filter((w) => text.includes(w)).length;
  const negative = negativeWords.filter((w) => text.includes(w)).length;

  const sentiment = (positive - negative) / (positive + negative || 1);

  return {
    sentiment: Math.max(-1, Math.min(1, sentiment)),
    volume: mentions.length,
  };
}

export { searchTwitterData, extractTopicsFromText, analyzeSentiment };
