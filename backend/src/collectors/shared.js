// Shared utilities: sentiment, topic matching, region detection, response builder

// ── Topic seeds → granular topic names ──
export const TOPIC_SEEDS = {
  'border security':   ['border', 'wall', 'immigration', 'migrant', 'crossing', 'deportation', 'ice', 'cbp', 'asylum', 'undocumented'],
  'energy & grid':     ['ercot', 'grid', 'power outage', 'electricity', 'blackout', 'solar', 'wind farm', 'oil', 'natural gas', 'pipeline', 'energy crisis', 'freeze', 'outage'],
  'education':         ['school', 'education', 'teacher', 'voucher', 'curriculum', 'student', 'university', 'tuition', 'isd', 'school choice', 'dei', 'school board'],
  'healthcare':        ['healthcare', 'medicaid', 'hospital', 'insurance', 'clinic', 'mental health', 'drug price', 'uninsured', 'medical debt', 'abortion', 'reproductive'],
  'economy & jobs':    ['economy', 'jobs', 'unemployment', 'inflation', 'wage', 'business', 'recession', 'layoff', 'workforce', 'gdp'],
  'housing':           ['housing', 'homeless', 'rent', 'mortgage', 'affordable housing', 'zoning', 'eviction', 'apartment', 'home price', 'homebuilder'],
  'property tax':      ['property tax', 'appraisal', 'homestead', 'tax relief', 'tax rate', 'tax freeze', 'property taxes'],
  'crime & safety':    ['crime', 'police', 'prison', 'arrest', 'murder', 'fentanyl', 'cartel', 'gang', 'shooting', 'violent crime', 'drug trafficking', 'law enforcement'],
  'elections':         ['vote', 'election', 'ballot', 'primary', 'campaign', 'polling', 'runoff', 'voter id', 'voter suppression', 'early voting'],
  'water & drought':   ['water', 'drought', 'flood', 'reservoir', 'aquifer', 'water supply', 'water rights', 'flooding', 'water quality'],
  'transportation':    ['highway', 'i-35', 'traffic', 'transit', 'txdot', 'toll road', 'commute', 'high speed rail', 'bus', 'light rail'],
  'gun policy':        ['gun', 'firearm', 'shooting', 'second amendment', '2a', 'nra', 'open carry', 'gun control', 'gun violence'],
  'cost of living':    ['cost of living', 'afford', 'expensive', 'price increase', 'grocery', 'food cost', 'utility bill', 'fees'],
  'tech & innovation': ['tech', 'ai', 'startup', 'spacex', 'tesla', 'semiconductor', 'data center', 'artificial intelligence'],
};

// ── Topic → category mapping ──
const CATEGORY_MAP = {
  'Cost of Living':  ['housing', 'property tax', 'cost of living'],
  'Economy':         ['economy & jobs', 'energy & grid', 'transportation', 'tech & innovation'],
  'Health Care':     ['healthcare'],
  'Education':       ['education'],
};

// ── TX region detection ──
const TX_REGIONS = {
  'gulf-coast':    ['houston', 'galveston', 'beaumont', 'pasadena', 'sugar land', 'woodlands', 'katy', 'baytown', 'pearland', 'league city', 'port arthur', 'corpus christi', 'htx', 'htown', 'clear lake'],
  'north-texas':   ['dallas', 'fort worth', 'plano', 'arlington', 'denton', 'frisco', 'mckinney', 'garland', 'irving', 'dfw', 'richardson', 'allen', 'prosper', 'collin county'],
  'central-texas': ['austin', 'waco', 'san marcos', 'round rock', 'temple', 'killeen', 'georgetown', 'pflugerville', 'atx', 'cedar park', 'hutto', 'bastrop'],
  'south-texas':   ['san antonio', 'laredo', 'mcallen', 'brownsville', 'harlingen', 'rgv', 'rio grande', 'edinburg', 'satx', 'bexar', 'hidalgo county'],
  'west-texas':    ['el paso', 'midland', 'odessa', 'lubbock', 'amarillo', 'abilene', 'san angelo', 'permian basin'],
  'east-texas':    ['tyler', 'longview', 'nacogdoches', 'lufkin', 'texarkana', 'marshall', 'etx', 'piney woods'],
};

export const REGION_LABELS = {
  'gulf-coast':    'Houston / Gulf Coast',
  'north-texas':   'Dallas-Fort Worth',
  'central-texas': 'Austin / Central TX',
  'south-texas':   'San Antonio / South TX',
  'west-texas':    'West Texas',
  'east-texas':    'East Texas',
};

// ── Sentiment word lists ──
const POS_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love',
  'best', 'better', 'improve', 'improvement', 'growth', 'success', 'support',
  'approve', 'approval', 'progress', 'reform', 'boost', 'benefit', 'benefits',
  'achieve', 'strong', 'effective', 'efficient', 'help', 'protect', 'protection',
  'safe', 'safety', 'secure', 'security', 'opportunity', 'win', 'winning',
  'solution', 'solved', 'invest', 'investment', 'relief', 'lower', 'reduce',
  'increase', 'expand', 'expanding', 'fund', 'funding', 'pass', 'passed',
  'signed', 'approved', 'bipartisan', 'working', 'fix', 'fixed', 'restore',
  'saved', 'saving', 'affordable', 'affordable housing', 'access',
];

const NEG_WORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'worse', 'decline',
  'fail', 'failure', 'crisis', 'problem', 'disaster', 'corrupt', 'corruption',
  'scandal', 'broken', 'dangerous', 'threat', 'attack', 'fear', 'collapse',
  'skyrocket', 'unaffordable', 'expensive', 'struggle', 'struggling', 'concern',
  'worried', 'worry', 'alarming', 'frustrated', 'inadequate', 'insufficient',
  'lack', 'missing', 'lost', 'losing', 'damage', 'harm', 'harmful', 'oppose',
  'reject', 'rejected', 'blocked', 'eliminate', 'closed', 'shutdown', 'evacuate',
  'flood', 'outage', 'blackout', 'freeze', 'eviction', 'homeless', 'surge',
  'overloaded', 'overcrowded', 'violence', 'crime', 'shooting', 'killed',
  'died', 'death', 'uninsured', 'cut', 'cuts', 'veto', 'vetoed', 'fail',
  'failing', 'underfunded', 'gridlock', 'stalled', 'delayed', 'denied',
];

// Negation words that flip sentiment
const NEGATION = ['not', "n't", 'no', 'never', 'without', 'hardly', 'barely'];

export function analyzeSentiment(text) {
  if (!text || text.length < 5) return 0;
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  let score = 0;
  let total = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/[^a-z']/g, '');
    const prevWord = i > 0 ? words[i - 1].replace(/[^a-z']/g, '') : '';
    const isNegated = NEGATION.includes(prevWord);

    if (POS_WORDS.includes(w)) {
      score += isNegated ? -1 : 1;
      total++;
    } else if (NEG_WORDS.includes(w)) {
      score += isNegated ? 1 : -1;
      total++;
    }
  }

  if (total === 0) return 0;
  // Normalize: max possible is total, scale to -1..1 with dampening
  return Math.max(-1, Math.min(1, score / Math.max(total, 3)));
}

export function matchTopics(text) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const [topic, keywords] of Object.entries(TOPIC_SEEDS)) {
    if (keywords.some(k => lower.includes(k))) {
      matched.push(topic);
    }
  }
  return matched;
}

export function topicToCategory(topic) {
  for (const [cat, topics] of Object.entries(CATEGORY_MAP)) {
    if (topics.includes(topic)) return cat;
  }
  return null;
}

export function detectRegion(text) {
  const lower = text.toLowerCase();
  for (const [regionId, cities] of Object.entries(TX_REGIONS)) {
    if (cities.some(c => lower.includes(c))) return regionId;
  }
  return null;
}

// ── Build final API response from normalized posts ──
// normalized post shape: { id, source, title, text, url, author, publishedAt, engagement, region, sentiment, matchedTopics }
export function buildResponse(posts, sourceLabel) {
  if (!posts.length) return null;

  // ── Topic aggregation ──
  const topicMap = {};
  for (const post of posts) {
    for (const topicName of post.matchedTopics) {
      if (!topicMap[topicName]) {
        topicMap[topicName] = { sentiments: [], volume: 0, mentions: [], byRegion: {}, sourceCounts: {} };
      }
      const t = topicMap[topicName];
      t.sentiments.push(post.sentiment);
      t.volume++;
      const src = post.source || 'unknown';
      t.sourceCounts[src] = (t.sourceCounts[src] || 0) + 1;

      if (t.mentions.length < 5) {
        t.mentions.push({
          text: post.title || post.text.substring(0, 120),
          sentiment: post.sentiment,
          source: post.source,
          region: post.region,
          url: post.url,
        });
      }

      const reg = post.region || '_statewide';
      if (!t.byRegion[reg]) t.byRegion[reg] = { sentiments: [], volume: 0 };
      t.byRegion[reg].sentiments.push(post.sentiment);
      t.byRegion[reg].volume++;
    }
  }

  const topics = Object.entries(topicMap).map(([name, t]) => {
    const avg = t.sentiments.reduce((a, b) => a + b, 0) / t.sentiments.length;
    const byRegion = {};
    for (const [reg, rd] of Object.entries(t.byRegion)) {
      if (reg === '_statewide') continue;
      byRegion[reg] = {
        sentiment: Math.round((rd.sentiments.reduce((a, b) => a + b, 0) / rd.sentiments.length) * 100) / 100,
        volume: rd.volume,
      };
    }
    return {
      name,
      sentiment: Math.round(avg * 100) / 100,
      volume: t.volume,
      byRegion,
      topMentions: t.mentions,
      sourceCounts: t.sourceCounts,
    };
  }).sort((a, b) => b.volume - a.volume);

  // ── Category aggregation (4 fixed buckets) ──
  const catMap = { 'Cost of Living': [], 'Economy': [], 'Health Care': [], 'Education': [] };
  for (const post of posts) {
    for (const topicName of post.matchedTopics) {
      const cat = topicToCategory(topicName);
      if (cat && catMap[cat]) catMap[cat].push(post.sentiment);
    }
  }

  const categories = Object.entries(catMap).map(([name, sentiments]) => ({
    name,
    sentiment: sentiments.length > 0
      ? Math.round((sentiments.reduce((a, b) => a + b, 0) / sentiments.length) * 100) / 100
      : 0,
    volume: sentiments.length,
    delta: 0,
  }));

  // ── Overall score (engagement-weighted) ──
  const totalEngagement = posts.reduce((s, p) => s + p.engagement, 0);
  const weightedSentiment = posts.reduce((s, p) => s + p.sentiment * p.engagement, 0);
  const overallScore = totalEngagement > 0
    ? Math.round((weightedSentiment / totalEngagement) * 100) / 100
    : Math.round((posts.reduce((s, p) => s + p.sentiment, 0) / posts.length) * 100) / 100;

  // ── Biggest movers: topics with most mentions ──
  const biggestMovers = topics.slice(0, 5).map(t => ({
    name: t.name,
    sentiment: t.sentiment,
    delta: 0,
    volume: t.volume,
  }));

  return {
    date: new Date().toISOString().split('T')[0],
    source: sourceLabel,
    overallScore,
    scoreDelta: 0,
    totalVolume: posts.length,
    categories,
    biggestMovers,
    topics,
    regions: REGION_LABELS,
  };
}
