// Client-side demo fallback — mirrors backend shape

const REGIONS = ['gulf-coast', 'north-texas', 'central-texas', 'south-texas', 'west-texas', 'east-texas'];
const REGION_LABELS = {
  'gulf-coast': 'Houston / Gulf Coast',
  'north-texas': 'Dallas-Fort Worth',
  'central-texas': 'Austin / Central TX',
  'south-texas': 'San Antonio / South TX',
  'west-texas': 'West Texas',
  'east-texas': 'East Texas',
};

const ALL_TOPICS = [
  'border security', 'energy & grid', 'education', 'healthcare',
  'economy & jobs', 'abortion', 'gun policy', 'water & drought',
  'crime & safety', 'elections', 'housing', 'property tax',
];

// Predetermined primary categories for Michael Searle
const PRIMARY_CATEGORIES = {
  'Cost of Living': ['housing', 'property tax'],
  'Economy': ['economy & jobs'],
  'Health Care': ['healthcare'],
  'Education': ['education'],
};

function seed(str, offset = 0) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h + offset;
}

function seededRandom(s) {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

function calculateOverallScore(topics) {
  if (topics.length === 0) return 0;
  const totalWeight = topics.reduce((sum, t) => sum + t.volume, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = topics.reduce((sum, t) => sum + (t.sentiment * t.volume), 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function getDailySentimentData() {
  const today = new Date();
  const dayOffset = Math.floor((today - new Date(2026, 0, 1)) / (1000 * 60 * 60 * 24));

  const activeCount = 6 + Math.floor(seededRandom(seed('active', dayOffset)) * 4);
  const shuffled = ALL_TOPICS.slice().sort((a, b) => seed(a, dayOffset) - seed(b, dayOffset));
  const activeTopics = shuffled.slice(0, activeCount);

  const topics = activeTopics.map(name => {
    const sentiment = Math.round((seededRandom(seed(name, dayOffset)) * 2 - 1) * 100) / 100;
    const volume = Math.floor(40 + seededRandom(seed(name + 'vol', dayOffset)) * 260);

    const byRegion = {};
    for (const region of REGIONS) {
      byRegion[region] = {
        sentiment: Math.round((seededRandom(seed(name + region, dayOffset)) * 2 - 1) * 100) / 100,
        volume: Math.floor(volume * (0.08 + seededRandom(seed(name + region + 'v', dayOffset)) * 0.25)),
      };
    }

    return {
      name,
      sentiment,
      volume,
      byRegion,
      topMentions: [
        { text: `Discussion about ${name} trending in Texas`, sentiment, source: 'twitter', region: REGIONS[0] },
        { text: `${name} debate intensifies across the state`, sentiment: sentiment * 0.8, source: 'twitter', region: REGIONS[1] },
      ],
    };
  }).sort((a, b) => b.volume - a.volume);

  // Calculate overall sentiment score
  const overallScore = calculateOverallScore(topics);

  // Calculate yesterday's score for delta
  const yesterdayOffset = dayOffset - 1;
  const yesterdayActiveCount = 6 + Math.floor(seededRandom(seed('active', yesterdayOffset)) * 4);
  const yesterdayShuffled = ALL_TOPICS.slice().sort((a, b) => seed(a, yesterdayOffset) - seed(b, yesterdayOffset));
  const yesterdayTopics = yesterdayShuffled.slice(0, yesterdayActiveCount).map(name => ({
    sentiment: Math.round((seededRandom(seed(name, yesterdayOffset)) * 2 - 1) * 100) / 100,
    volume: Math.floor(40 + seededRandom(seed(name + 'vol', yesterdayOffset)) * 260),
  }));
  const yesterdayScore = calculateOverallScore(yesterdayTopics);
  const scoreDelta = Math.round((overallScore - yesterdayScore) * 100) / 100;

  // Calculate category-level scores
  const categories = Object.entries(PRIMARY_CATEGORIES).map(([categoryName, categoryTopics]) => {
    const categoryData = topics.filter(t => categoryTopics.includes(t.name));

    if (categoryData.length === 0) {
      // Generate synthetic data for category if no matching topics active
      const catSentiment = Math.round((seededRandom(seed(categoryName, dayOffset)) * 2 - 1) * 100) / 100;
      const catVolume = Math.floor(40 + seededRandom(seed(categoryName + 'vol', dayOffset)) * 260);
      return {
        name: categoryName,
        sentiment: catSentiment,
        volume: catVolume,
        topics: categoryTopics,
      };
    }

    const sentiment = calculateOverallScore(categoryData);
    const volume = categoryData.reduce((sum, t) => sum + t.volume, 0);

    // Calculate yesterday's category score for trend
    const yesterdayCategoryData = categoryTopics.map(name => ({
      sentiment: Math.round((seededRandom(seed(name, yesterdayOffset)) * 2 - 1) * 100) / 100,
      volume: Math.floor(40 + seededRandom(seed(name + 'vol', yesterdayOffset)) * 260),
    }));
    const yesterdayCatScore = calculateOverallScore(yesterdayCategoryData);
    const categoryDelta = Math.round((sentiment - yesterdayCatScore) * 100) / 100;

    return {
      name: categoryName,
      sentiment,
      volume,
      delta: categoryDelta,
      topics: categoryTopics,
    };
  });

  // Calculate biggest movers (topics with largest sentiment swings)
  const topicsWithDeltas = topics.map(topic => {
    const yesterdaySentiment = Math.round((seededRandom(seed(topic.name, yesterdayOffset)) * 2 - 1) * 100) / 100;
    const delta = Math.round((topic.sentiment - yesterdaySentiment) * 100) / 100;
    return { ...topic, delta };
  });

  // Get top 5 biggest movers (by absolute delta value)
  const biggestMovers = topicsWithDeltas
    .slice()
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  return {
    date: today.toISOString().split('T')[0],
    source: 'demo',
    totalVolume: topics.reduce((s, t) => s + t.volume, 0),
    overallScore,
    scoreDelta,
    categories,
    biggestMovers,
    regions: REGION_LABELS,
    topics,
  };
}
