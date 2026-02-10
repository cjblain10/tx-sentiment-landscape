// Demo data generator — topic-based with regional breakdowns
// Mirrors the real data shape so the frontend works identically

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
  'transportation', 'tech & innovation',
];

const SAMPLE_MENTIONS = {
  'border security': [
    'Texas border crossings hit new daily record amid federal policy debate',
    'Governor deploys additional National Guard to border region',
    'Border security funding bill advances through state legislature',
  ],
  'energy & grid': [
    'ERCOT issues conservation alert as summer temperatures surge',
    'Texas wind farms generate record power output this quarter',
    'Grid reliability concerns as new data centers strain capacity',
  ],
  'education': [
    'School voucher bill faces final vote in Texas House',
    'Teacher shortage reaches critical levels in rural districts',
    'State funding increase approved for public school districts',
  ],
  'healthcare': [
    'Rural hospital closures accelerate across East Texas',
    'Medicaid expansion debate resurfaces in legislature',
    'Mental health funding bill gains bipartisan support',
  ],
  'economy & jobs': [
    'Texas unemployment falls to lowest level in two years',
    'Tech layoffs hit Austin hard as major firms restructure',
    'Small business growth surges in DFW metro area',
  ],
  'abortion': [
    'New legal challenge filed against state abortion restrictions',
    'Reproductive healthcare access varies widely by region',
    'Abortion debate dominates primary campaign messaging',
  ],
  'gun policy': [
    'Open carry expansion bill introduced in special session',
    'Gun violence prevention advocates rally at state capitol',
    'School safety measures debated after recent incidents',
  ],
  'water & drought': [
    'West Texas water levels drop to historic lows',
    'State water board approves new conservation measures',
    'Drought conditions expand across Panhandle region',
  ],
  'crime & safety': [
    'Fentanyl seizures surge along southern corridor',
    'Police staffing shortages hit major metro areas',
    'Property crime rates diverge between urban and suburban areas',
  ],
  'elections': [
    'Early voting turnout surpasses midterm projections',
    'Redistricting challenges head to federal court',
    'Campaign spending hits record levels in state races',
  ],
  'housing': [
    'Housing affordability crisis deepens in Austin metro',
    'Houston homelessness numbers show slight decline',
    'New zoning proposals face pushback in Dallas suburbs',
  ],
  'property tax': [
    'Property appraisals jump 15% in major metro areas',
    'Homestead exemption increase signed into law',
    'Tax relief measures face implementation challenges',
  ],
  'transportation': [
    'I-35 expansion project enters controversial new phase',
    'High speed rail proposal between Houston and Dallas revived',
    'TxDOT announces major highway funding allocation',
  ],
  'tech & innovation': [
    'New semiconductor fab breaks ground outside Austin',
    'AI startups flock to Texas amid favorable business climate',
    'SpaceX Starbase expansion draws mixed reactions in South TX',
  ],
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

function genSentiment(name, dayOffset) {
  const s = seed(name, dayOffset);
  return Math.round((seededRandom(s) * 2 - 1) * 100) / 100;
}

function genVolume(name, dayOffset) {
  const s = seed(name + 'vol', dayOffset);
  return Math.floor(40 + seededRandom(s) * 260);
}

export function getDailySentimentData() {
  const today = new Date();
  const dayOffset = Math.floor((today - new Date(2026, 0, 1)) / (1000 * 60 * 60 * 24));

  // Simulate dynamic: 6-10 active topics per day
  const activeCount = 6 + Math.floor(seededRandom(seed('active', dayOffset)) * 5);
  // Shuffle topics deterministically for this day
  const shuffled = ALL_TOPICS.slice().sort((a, b) => seed(a, dayOffset) - seed(b, dayOffset));
  const activeTopics = shuffled.slice(0, activeCount);

  const topics = activeTopics.map(name => {
    const sentiment = genSentiment(name, dayOffset);
    const volume = genVolume(name, dayOffset);

    const byRegion = {};
    for (const region of REGIONS) {
      const rSentiment = genSentiment(name + region, dayOffset);
      const rVolume = Math.floor(volume * (0.08 + seededRandom(seed(name + region + 'v', dayOffset)) * 0.25));
      byRegion[region] = { sentiment: rSentiment, volume: rVolume };
    }

    const mentions = (SAMPLE_MENTIONS[name] || [`Trending discussion about ${name} in Texas`]).map((text, i) => ({
      text,
      sentiment: genSentiment(name + 'mention' + i, dayOffset),
      source: 'twitter',
      region: REGIONS[Math.floor(seededRandom(seed(name + 'mr' + i, dayOffset)) * REGIONS.length)],
    }));

    return { name, sentiment, volume, byRegion, topMentions: mentions };
  }).sort((a, b) => b.volume - a.volume);

  return {
    date: today.toISOString().split('T')[0],
    source: 'demo',
    totalVolume: topics.reduce((s, t) => s + t.volume, 0),
    regions: REGION_LABELS,
    topics,
  };
}

export function getHistoricalSentimentData(days = 30) {
  const history = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOffset = Math.floor((date - new Date(2026, 0, 1)) / (1000 * 60 * 60 * 24));

    const activeCount = 6 + Math.floor(seededRandom(seed('active', dayOffset)) * 5);
    const shuffled = ALL_TOPICS.slice().sort((a, b) => seed(a, dayOffset) - seed(b, dayOffset));
    const activeTopics = shuffled.slice(0, activeCount);

    const topics = activeTopics.map(name => ({
      name,
      sentiment: genSentiment(name, dayOffset),
      volume: genVolume(name, dayOffset),
    }));

    history.push({
      date: date.toISOString().split('T')[0],
      topics,
    });
  }

  return history.reverse();
}
