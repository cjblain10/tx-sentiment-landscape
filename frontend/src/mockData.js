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

function seed(str, offset = 0) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h + offset;
}

function seededRandom(s) {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
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

  return {
    date: today.toISOString().split('T')[0],
    source: 'demo',
    totalVolume: topics.reduce((s, t) => s + t.volume, 0),
    regions: REGION_LABELS,
    topics,
  };
}
