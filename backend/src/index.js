import express from 'express';
import cors from 'cors';
import { getDailySentimentData, getHistoricalSentimentData, generateTerrainMesh, FIGURES } from './mockData.js';
import { searchTwitterData, extractTopicsFromText, analyzeSentiment } from './realData.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get today's sentiment data (real or mock based on env)
app.get('/api/sentiment/today', async (req, res) => {
  try {
    // Default to real data (USE_MOCK must be explicitly set to 'true' for mock)
    if (process.env.USE_MOCK !== 'true') {
      console.log('📡 Fetching real Twitter data...');

      const figures = FIGURES;
      const queries = figures.map(f => f.name).join(' OR ');
      const twitterData = await searchTwitterData(`(${queries}) Texas`, 100);

      if (twitterData && twitterData.data) {
        const mentions = twitterData.data.map(t => t.text);
        const topics = await extractTopicsFromText(mentions);

        // Build sentiment data with real topics
        const data = {
          date: new Date().toISOString().split('T')[0],
          source: 'twitter-real',
          figures: []
        };

        for (const figure of figures) {
          const figureMentions = mentions.filter(m =>
            m.toLowerCase().includes(figure.name.toLowerCase())
          );

          // Calculate figure sentiment from topic sentiments
          let figureSentiment = 0;
          let topicCount = 0;
          const figureTopics = [];

          for (const topic of topics) {
            const topicMentions = figureMentions.filter(m =>
              m.toLowerCase().includes(topic.name.toLowerCase())
            );

            if (topicMentions.length > 0) {
              const sentiment = await analyzeSentiment(topic.name, topicMentions);
              figureSentiment += sentiment.sentiment;
              topicCount++;

              figureTopics.push({
                name: topic.name,
                sentiment: sentiment.sentiment,
                volume: topicMentions.length,
                topMentions: [{
                  text: topicMentions[0] || `${topic.name} trending`,
                  sentiment: sentiment.sentiment,
                  source: 'twitter'
                }]
              });
            }
          }

          data.figures.push({
            id: figure.id,
            name: figure.name,
            x: figure.x,
            y: figure.y,
            sentiment: topicCount > 0 ? figureSentiment / topicCount : 0,
            volume: figureMentions.length,
            issues: figureTopics.slice(0, 7)
          });
        }

        return res.json(data);
      }
    }

    // Fallback to mock data
    console.log('📊 Using mock data');
    const data = getDailySentimentData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    res.json(getDailySentimentData()); // Fallback to mock
  }
});

// Get historical data for timeline
app.get('/api/sentiment/history', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const data = getHistoricalSentimentData(days);
  res.json(data);
});

// Get 3D terrain mesh data
app.get('/api/terrain/mesh', (req, res) => {
  const mesh = generateTerrainMesh();
  res.json(mesh);
});

// Get figure metadata
app.get('/api/figures', (req, res) => {
  res.json(FIGURES);
});

// Get sentiment for specific figure
app.get('/api/sentiment/figure/:figureId', (req, res) => {
  const data = getDailySentimentData();
  const figure = data.figures.find(f => f.id === req.params.figureId);

  if (!figure) {
    return res.status(404).json({ error: 'Figure not found' });
  }

  res.json(figure);
});

app.listen(PORT, () => {
  console.log(`✅ TX Sentiment Backend running on http://localhost:${PORT}`);
  console.log(`📊 Try: http://localhost:${PORT}/api/sentiment/today`);
});
