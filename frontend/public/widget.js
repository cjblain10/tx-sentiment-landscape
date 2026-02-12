/**
 * TX Sentiment Widget - Embeddable JavaScript Widget
 * Usage: <script src="https://sentiment.localinsights.ai/widget.js"></script>
 */

(function(window) {
  'use strict';

  const API_URL = 'https://tx-sentinel-api.onrender.com';

  const styles = `
    .tx-sentiment-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 1.5rem;
      background: #0a0e1a;
      color: #f1f5f9;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tx-sentiment-widget.light {
      background: #ffffff;
      color: #1a1a1a;
      border-color: #e2e8f0;
    }

    .tx-widget-header {
      text-align: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .light .tx-widget-header {
      border-bottom-color: #e2e8f0;
    }

    .tx-widget-title {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }

    .tx-overall-score {
      font-size: 3rem;
      font-weight: 700;
      font-family: 'Courier New', monospace;
    }

    .tx-overall-score.pos { color: #10b981; }
    .tx-overall-score.neg { color: #ef4444; }

    .tx-delta {
      display: inline-block;
      margin-left: 0.75rem;
      font-size: 1rem;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
    }

    .light .tx-delta {
      background: #f1f5f9;
    }

    .tx-delta.pos { color: #10b981; }
    .tx-delta.neg { color: #ef4444; }

    .tx-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .tx-category {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 0.9rem;
      text-align: center;
    }

    .light .tx-category {
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .tx-category-name {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }

    .tx-category-score {
      font-size: 1.4rem;
      font-weight: 700;
      font-family: 'Courier New', monospace;
    }

    .tx-category-score.pos { color: #10b981; }
    .tx-category-score.neg { color: #ef4444; }

    .tx-widget-footer {
      text-align: center;
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .light .tx-widget-footer {
      border-top-color: #e2e8f0;
    }

    .tx-widget-footer a {
      color: #C4553A;
      text-decoration: none;
    }

    .tx-widget-footer a:hover {
      text-decoration: underline;
    }

    .tx-loading {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }

    .tx-sentiment-widget.compact {
      padding: 1rem;
    }

    .tx-sentiment-widget.compact .tx-widget-title {
      font-size: 1.1rem;
    }

    .tx-sentiment-widget.compact .tx-overall-score {
      font-size: 2rem;
    }

    .tx-sentiment-widget.compact .tx-categories {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.5rem;
    }

    .tx-sentiment-widget.compact .tx-category {
      padding: 0.6rem;
    }
  `;

  function injectStyles() {
    if (document.getElementById('tx-sentiment-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'tx-sentiment-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  async function fetchSentimentData() {
    const response = await fetch(`${API_URL}/api/sentiment/today`);
    return response.json();
  }

  function renderWidget(container, data, options) {
    const { theme = 'dark', compact = false } = options;

    const deltaClass = data.scoreDelta > 0 ? 'pos' : 'neg';
    const scoreClass = data.overallScore >= 0 ? 'pos' : 'neg';

    container.className = `tx-sentiment-widget ${theme} ${compact ? 'compact' : ''}`;
    container.innerHTML = `
      <div class="tx-widget-header">
        <div class="tx-widget-title">How Texans Feel Right Now</div>
        <div>
          <span class="tx-overall-score ${scoreClass}">
            ${data.overallScore >= 0 ? '+' : ''}${data.overallScore.toFixed(1)}
          </span>
          ${data.scoreDelta !== 0 ? `
            <span class="tx-delta ${deltaClass}">
              ${data.scoreDelta > 0 ? '▲' : '▼'}${Math.abs(data.scoreDelta).toFixed(1)}
            </span>
          ` : ''}
        </div>
      </div>

      <div class="tx-categories">
        ${data.categories.map(cat => `
          <div class="tx-category">
            <div class="tx-category-name">${cat.name}</div>
            <div class="tx-category-score ${cat.sentiment >= 0 ? 'pos' : 'neg'}">
              ${cat.sentiment >= 0 ? '+' : ''}${cat.sentiment.toFixed(1)}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="tx-widget-footer">
        Powered by <a href="https://sentiment.localinsights.ai" target="_blank">LocalInsights.ai</a>
      </div>
    `;
  }

  const TXSentiment = {
    async init(options = {}) {
      const { container = '#tx-sentiment-widget', theme = 'dark', compact = false } = options;

      injectStyles();

      const containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!containerEl) {
        console.error(`TX Sentiment: Container "${container}" not found`);
        return;
      }

      containerEl.className = `tx-sentiment-widget ${theme} ${compact ? 'compact' : ''}`;
      containerEl.innerHTML = '<div class="tx-loading">Loading sentiment data...</div>';

      try {
        const data = await fetchSentimentData();
        renderWidget(containerEl, data, { theme, compact });
      } catch (error) {
        console.error('TX Sentiment: Failed to load data', error);
        containerEl.innerHTML = '<div class="tx-loading">Unable to load sentiment data</div>';
      }
    }
  };

  window.TXSentiment = TXSentiment;
})(window);
