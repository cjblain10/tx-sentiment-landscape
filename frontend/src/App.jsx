import React, { useEffect, useState } from 'react';
import { TerrainVisualization } from './TerrainVisualization';
import { getDailySentimentData } from './mockData';
import './App.css';

function App() {
  const [sentimentData, setSentimentData] = useState(null);
  const [selectedFigure, setSelectedFigure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('mock'); // 'api' or 'mock'

  useEffect(() => {
    // Try to fetch from API, fall back to mock data
    fetch('/api/sentiment/today')
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        setSentimentData(data);
        setDataSource('api');
        setLoading(false);
      })
      .catch(err => {
        console.log('Using mock data (API unavailable):', err.message);
        setSentimentData(getDailySentimentData());
        setDataSource('mock');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="loading">Loading political sentiment landscape...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🌍 Texas Political Sentiment Landscape</h1>
        <p>Real-time sentiment monitoring for TX political figures</p>
      </header>

      <div className="main-layout">
        <div className="visualization-container">
          <TerrainVisualization />
          <div className="controls">
            <p className="tip">💡 Drag to rotate • Scroll to zoom</p>
          </div>
        </div>

        <aside className="sidebar">
          <div className="panel">
            <h2>📊 Figures</h2>
            <div className="figures-list">
              {sentimentData?.figures.map(figure => (
                <div
                  key={figure.id}
                  className={`figure-card ${selectedFigure?.id === figure.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFigure(figure)}
                >
                  <div className="figure-name">{figure.name}</div>
                  <div className="sentiment-bar">
                    <div
                      className="sentiment-fill"
                      style={{
                        width: `${(figure.sentiment + 1) * 50}%`,
                        backgroundColor: figure.sentiment > 0 ? '#10b981' : '#ef4444',
                      }}
                    />
                  </div>
                  <div className="sentiment-value">{figure.sentiment.toFixed(2)}</div>
                  <div className="volume">💬 {figure.volume} mentions</div>
                </div>
              ))}
            </div>
          </div>

          {selectedFigure && (
            <div className="panel details">
              <h3>{selectedFigure.name}</h3>
              <div className="detail-group">
                <label>Overall Sentiment:</label>
                <div className="big-number">{selectedFigure.sentiment.toFixed(2)}</div>
              </div>
              <div className="detail-group">
                <label>Total Mentions:</label>
                <div className="big-number">{selectedFigure.volume}</div>
              </div>
              <div className="detail-group">
                <label>Top Issues:</label>
                <ul className="issues-list">
                  {selectedFigure.issues?.slice(0, 5).map(issue => (
                    <li key={issue.name}>
                      <strong>{issue.name}</strong>: {issue.sentiment.toFixed(2)} ({issue.volume} mentions)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="footer">
        <p>
          🚀 {dataSource === 'api' ? '✅ Live API' : '📊 Mock Data'} •
          {dataSource === 'mock' && ' Backend API coming soon'}
        </p>
      </footer>
    </div>
  );
}

export default App;
