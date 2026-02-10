// Client-side mock data - mirrors backend but works standalone

export const FIGURES = [
  { id: 'gov', name: 'TX Governor', x: 0, y: 0 },
  { id: 'lt-gov', name: 'Lt. Governor', x: 1, y: 0 },
  { id: 'ag', name: 'Attorney General', x: 2, y: 0 },
  { id: 'wesley-hunt', name: 'Wesley Hunt', x: 0, y: 1 },
  { id: 'jon-cornyn', name: 'Jon Cornyn', x: 1, y: 1 },
  { id: 'ted-cruz', name: 'Ted Cruz', x: 2, y: 1 },
  { id: 'jasmine-crockett', name: 'Jasmine Crockett', x: 0, y: 2 },
  { id: 'james-talarico', name: 'James Talarico', x: 1, y: 2 },
];

export const ISSUES = [
  'abortion',
  'energy',
  'border',
  'education',
  'economy',
  'immigration',
  'healthcare',
];

function generateSentiment(personId, issueId, dayOffset = 0) {
  const seed = personId.charCodeAt(0) + issueId.charCodeAt(0) + dayOffset * 7;
  const noise = Math.sin(seed) * 0.3;
  const trend = Math.sin(dayOffset / 5) * 0.2;
  return Math.max(-1, Math.min(1, noise + trend));
}

function generateVolume(personId, issueId, dayOffset = 0) {
  const seed = personId.charCodeAt(0) * issueId.charCodeAt(0) + dayOffset * 11;
  return Math.floor(50 + Math.abs(Math.sin(seed) * 150));
}

export function getDailySentimentData() {
  const today = new Date();
  const dayOffset = Math.floor((today - new Date(2026, 1, 1)) / (1000 * 60 * 60 * 24));

  const data = {
    date: today.toISOString().split('T')[0],
    figures: [],
  };

  for (const figure of FIGURES) {
    const figureData = {
      ...figure,
      sentiment: 0,
      volume: 0,
      issues: [],
    };

    let totalSentiment = 0;
    let totalVolume = 0;

    for (const issue of ISSUES) {
      const sentiment = generateSentiment(figure.id, issue, dayOffset);
      const volume = generateVolume(figure.id, issue, dayOffset);

      totalSentiment += sentiment;
      totalVolume += volume;

      figureData.issues.push({
        name: issue,
        sentiment,
        volume,
        topMentions: [
          {
            text: `"${issue}" trending with ${figure.name}`,
            sentiment,
            source: Math.random() > 0.5 ? 'twitter' : 'reddit',
          },
        ],
      });
    }

    figureData.sentiment = totalSentiment / ISSUES.length;
    figureData.volume = totalVolume;

    data.figures.push(figureData);
  }

  return data;
}

export function generateTerrainMesh() {
  const sentimentData = getDailySentimentData();
  const vertices = [];
  const colors = [];

  for (const figure of sentimentData.figures) {
    const height = figure.sentiment * 2;
    const x = figure.x * 3;
    const z = figure.y * 3;

    vertices.push(x, height, z);

    const intensity = Math.min(1, figure.volume / 300);
    const hue = figure.sentiment > 0 ? 0.3 : 0;
    const saturation = intensity;

    const rgb = hslToRgb(hue, saturation, 0.5);
    colors.push(rgb.r, rgb.g, rgb.b);
  }

  return { vertices, colors };
}

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255) / 255,
    g: Math.round(g * 255) / 255,
    b: Math.round(b * 255) / 255,
  };
}
