import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TrendSparkline } from './TrendSparkline';
import { getDailySentimentData } from './mockData';
import './App.css';

function capitalize(s) { return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

// Generate narrative summary from data
function generateSummary(data) {
  if (!data || !data.categories) return '';

  const categories = data.categories;
  const mostPositive = [...categories].sort((a, b) => b.sentiment - a.sentiment)[0];
  const mostNegative = [...categories].sort((a, b) => a.sentiment - b.sentiment)[0];

  const tone = data.overallScore >= 0.3 ? 'optimistic' :
                data.overallScore <= -0.3 ? 'pessimistic' :
                'mixed';

  const toneWords = {
    optimistic: 'Texans remain cautiously optimistic',
    pessimistic: 'Texans express growing concerns',
    mixed: 'Texans show mixed feelings'
  };

  return `${toneWords[tone]} as ${mostPositive.name.toLowerCase()} sentiment rises (${mostPositive.sentiment >= 0 ? '+' : ''}${mostPositive.sentiment.toFixed(1)}) while ${mostNegative.name.toLowerCase()} concerns ${mostNegative.sentiment < 0 ? 'deepen' : 'ease'} (${mostNegative.sentiment >= 0 ? '+' : ''}${mostNegative.sentiment.toFixed(1)}) across the state this week.`;
}

// Generate contextual statement for category
function getCategoryStatement(category) {
  const sentiment = category.sentiment;
  const name = category.name.toLowerCase();

  if (sentiment >= 0.3) return `Texans express growing optimism about ${name}`;
  if (sentiment >= 0) return `Sentiment on ${name} remains cautiously positive`;
  if (sentiment >= -0.3) return `Texans show concerns about ${name}`;
  return `Growing pessimism about ${name} across the state`;
}

/* ── Floating Particles ── */
function Particles({ count = 60 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let w = c.width = window.innerWidth, h = c.height = window.innerHeight;
    const onR = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener('resize', onR);
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.5, o: Math.random() * 0.2 + 0.05,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${d.o})`; ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(148,163,184,${0.05 * (1 - dist / 100)})`; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); };
  }, [count]);
  return <canvas ref={ref} className="particles" />;
}

/* ── App ── */
function App() {
  const [data, setData] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null); // null = statewide
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('demo');
  const [staleInfo, setStaleInfo] = useState(null); // { cachedAt } if serving stale data
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${apiUrl}/api/sentiment/today`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => {
        setData(d);
        setDataSource(d.source || 'api');
        if (d.stale) setStaleInfo({ cachedAt: d.cachedAt });
        setLoading(false);
      })
      .catch(() => { setData(getDailySentimentData()); setDataSource('demo'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!loading) { const t = setTimeout(() => setEntered(true), 50); return () => clearTimeout(t); }
  }, [loading]);

  // Derive topics for the active region
  const topics = (data?.topics || []).map(t => {
    if (!selectedRegion) return t; // statewide
    const rd = t.byRegion?.[selectedRegion];
    if (!rd || rd.volume === 0) return null;
    return { ...t, sentiment: rd.sentiment, volume: rd.volume };
  }).filter(Boolean).sort((a, b) => b.volume - a.volume);

  const totalVolume = topics.reduce((s, t) => s + t.volume, 0);
  const regions = data?.regions || {};

  const dateStr = data?.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Today';

  const handleSelectTopic = useCallback((name) => {
    setSelectedTopic(prev => prev?.name === name ? null : topics.find(t => t.name === name));
  }, [topics]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-ring" />
        <div className="loading-text">Reading the room...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Particles />

      <header className="header">
        <div className="header-left">
          <img
            src="https://d263zunsorfp81.cloudfront.net/assets/federalnewswire/lonestarstandard/brand-4e742847ec78903fb56ed56fdc663fb894389e528eb02e8cc311750971c4cf3d.webp"
            alt="Lone Star Standard"
            className="lss-logo"
          />
        </div>
        <div className="header-center">
          <h1 className="site-title">THE TEXAS PULSE</h1>
          <p className="site-subtitle">Real-time sentiment tracking powered by LocalInsights.ai</p>
        </div>
        <div className="header-right">
          <div className="live-badge">
            <span className={`live-dot ${dataSource !== 'twitter' ? 'dim' : ''}`} />
            {dataSource === 'twitter' && !staleInfo ? 'LIVE' : staleInfo ? 'CACHED' : 'DEMO'} &middot; {dateStr}
          </div>
        </div>
      </header>

      {/* DATA STATUS BANNER */}
      {(staleInfo || dataSource === 'demo') && (
        <div className={`status-banner ${staleInfo ? 'stale' : 'demo'}`}>
          {staleInfo ? (
            <>
              Live feed temporarily unavailable &middot; Showing cached data from{' '}
              {new Date(staleInfo.cachedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </>
          ) : (
            <>Demo data &middot; Live Twitter feed not currently connected</>
          )}
        </div>
      )}

      <main className="main">
        {/* LAYOUT: CENTER VISUALIZATION + RIGHT SIDEBAR */}
        <div className="content-wrapper">
          {/* LEFT/CENTER: SENTIMENT VISUALIZATION */}
          <div className="viz-area">
            {/* OVERALL SCORE */}
            {data && (
              <div className={`overall-score ${entered ? 'entered' : ''}`}>
                <div className="overall-label">Overall Texas Sentiment</div>
                <div className={`overall-value ${data.overallScore >= 0 ? 'pos' : 'neg'}`}>
                  {data.overallScore >= 0 ? '+' : ''}{data.overallScore.toFixed(1)}
                </div>
                {data.scoreDelta !== undefined && data.scoreDelta !== 0 && (
                  <div className={`overall-delta ${data.scoreDelta > 0 ? 'pos' : 'neg'}`}>
                    {data.scoreDelta > 0 ? '▲' : '▼'}{Math.abs(data.scoreDelta).toFixed(1)} from yesterday
                  </div>
                )}
                <div className="overall-meta">
                  Based on {totalVolume.toLocaleString()} mentions
                </div>
              </div>
            )}

            {/* REGION FILTER */}
            <div className={`region-filter ${entered ? 'entered' : ''}`}>
              <button
                className={`region-chip ${!selectedRegion ? 'active' : ''}`}
                onClick={() => { setSelectedRegion(null); setSelectedTopic(null); }}
              >
                All Texas
              </button>
              {Object.entries(regions).map(([id, label]) => (
                <button
                  key={id}
                  className={`region-chip ${selectedRegion === id ? 'active' : ''}`}
                  onClick={() => { setSelectedRegion(id); setSelectedTopic(null); }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* PULSE GRID - CIRCULAR SENTIMENT NODES */}
            <div className="pulse-grid">
              {topics.map((topic, idx) => {
                const isPos = topic.sentiment >= 0;
                const intensity = Math.min(Math.abs(topic.sentiment), 1);
                const isSelected = selectedTopic?.name === topic.name;

                return (
                  <button
                    key={topic.name}
                    className={`node ${isPos ? 'pos' : 'neg'} ${isSelected ? 'selected' : ''} ${entered ? 'entered' : ''}`}
                    style={{
                      '--glow': isPos ? '16,185,129' : '239,68,68',
                      '--intensity': intensity,
                      '--delay': `${idx * 0.07}s`,
                      '--pulse-dur': `${2.5 + (1 - intensity) * 2}s`,
                    }}
                    onClick={() => handleSelectTopic(topic.name)}
                  >
                    <div className="node-ring" />
                    <div className="node-inner">
                      <span className="node-name">{capitalize(topic.name)}</span>
                      <span className="node-score">
                        {isPos ? '+' : ''}{topic.sentiment.toFixed(2)}
                      </span>
                      <span className="node-vol">{topic.volume.toLocaleString()} mentions</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR: CONTEXT BOXES */}
          <div className="sidebar">
            {/* TODAY'S MOOD SUMMARY */}
            {data && (
              <div className={`context-box mood-box ${entered ? 'entered' : ''}`}>
                <h3 className="context-title">Today's Mood</h3>
                <p className="context-text">{generateSummary(data)}</p>
              </div>
            )}

            {/* KEY ISSUES */}
            {data?.categories && data.categories.length > 0 && (
              <div className={`context-box categories-box ${entered ? 'entered' : ''}`}>
                <h3 className="context-title">Key Issues</h3>
                <div className="context-list">
                  {data.categories.map((cat, idx) => {
                    const isPos = cat.sentiment >= 0;
                    return (
                      <div key={cat.name} className="context-item" style={{ '--delay': `${idx * 0.1}s` }}>
                        <div className="context-item-header">
                          <span className="context-item-name">{cat.name}</span>
                          {cat.delta !== undefined && cat.delta !== 0 && (
                            <span className={`context-item-delta ${cat.delta > 0 ? 'pos' : 'neg'}`}>
                              {cat.delta > 0 ? '▲' : '▼'}{Math.abs(cat.delta).toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className={`context-item-score ${isPos ? 'pos' : 'neg'}`}>
                          {isPos ? '+' : ''}{cat.sentiment.toFixed(1)}
                        </div>
                        <div className="context-item-meta">
                          {cat.volume.toLocaleString()} mentions
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BIGGEST SHIFTS */}
            {data?.biggestMovers && data.biggestMovers.length > 0 && (
              <div className={`context-box movers-box ${entered ? 'entered' : ''}`}>
                <h3 className="context-title">Biggest Shifts Today</h3>
                <div className="context-list">
                  {data.biggestMovers.map((topic, idx) => {
                    const isPos = topic.sentiment >= 0;
                    const deltaIsPos = topic.delta > 0;
                    return (
                      <div key={topic.name} className="context-item" style={{ '--delay': `${idx * 0.08}s` }}>
                        <div className="context-item-header">
                          <span className="context-item-name">{capitalize(topic.name)}</span>
                          <span className={`context-item-delta ${deltaIsPos ? 'pos' : 'neg'}`}>
                            {deltaIsPos ? '▲' : '▼'}{Math.abs(topic.delta).toFixed(1)}
                          </span>
                        </div>
                        <div className={`context-item-score ${isPos ? 'pos' : 'neg'}`}>
                          {isPos ? '+' : ''}{topic.sentiment.toFixed(1)}
                        </div>
                        <div className="context-item-meta">
                          {topic.volume.toLocaleString()} mentions
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DETAIL PANEL */}
        {selectedTopic && (
          <section className="detail" key={selectedTopic.name}>
            <div className="detail-top">
              <h3>{capitalize(selectedTopic.name)}</h3>
              <button className="detail-close" onClick={() => setSelectedTopic(null)}>&times;</button>
            </div>

            <div className="detail-nums">
              <div className="detail-num">
                <span className={`detail-big ${selectedTopic.sentiment >= 0 ? 'pos' : 'neg'}`}>
                  {selectedTopic.sentiment >= 0 ? '+' : ''}{selectedTopic.sentiment.toFixed(2)}
                </span>
                <span className="detail-label">Sentiment</span>
              </div>
              <div className="detail-num">
                <span className="detail-big">{selectedTopic.volume.toLocaleString()}</span>
                <span className="detail-label">Mentions</span>
              </div>
            </div>

            {/* Regional breakdown (show when statewide) */}
            {!selectedRegion && selectedTopic.byRegion && Object.keys(selectedTopic.byRegion).length > 0 && (
              <div className="detail-regions">
                <div className="detail-label" style={{ marginBottom: '0.75rem' }}>By Region</div>
                <div className="region-bars">
                  {Object.entries(selectedTopic.byRegion)
                    .filter(([, rd]) => rd.volume > 0)
                    .sort((a, b) => b[1].volume - a[1].volume)
                    .map(([regId, rd]) => (
                      <div key={regId} className="region-bar-row">
                        <span className="region-bar-label">{regions[regId] || regId}</span>
                        <div className="region-bar-track">
                          <div
                            className={`region-bar-fill ${rd.sentiment >= 0 ? 'pos' : 'neg'}`}
                            style={{ width: `${Math.min(Math.abs(rd.sentiment) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`region-bar-value ${rd.sentiment >= 0 ? 'pos' : 'neg'}`}>
                          {rd.sentiment >= 0 ? '+' : ''}{rd.sentiment.toFixed(2)}
                        </span>
                        <span className="region-bar-vol">{rd.volume}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 30-Day Trend */}
            <div className="detail-trend">
              <TrendSparkline topic={selectedTopic.name} dark />
            </div>

            {/* Sample Mentions */}
            {selectedTopic.topMentions?.length > 0 && (
              <div className="detail-mentions">
                <div className="detail-label" style={{ marginBottom: '0.75rem' }}>Sample Mentions</div>
                {selectedTopic.topMentions.map((m, i) => (
                  <div key={i} className="mention">
                    <span className="mention-text">&ldquo;{m.text}&rdquo;</span>
                    <span className="mention-src">
                      {m.source || 'twitter'}
                      {m.region && regions[m.region] ? ` · ${regions[m.region]}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <span>
          {dataSource === 'twitter' ? 'Twitter/X via Composio' : 'Demo data'}
          &nbsp;&middot;&nbsp;Dynamic topic discovery&nbsp;&middot;&nbsp;Updated daily
        </span>
        <span>
          A <a href="https://lonestarstandard.com" target="_blank" rel="noopener">Lone Star Standard</a> project powered by <a href="https://localinsights.ai" target="_blank" rel="noopener">LocalInsights.ai</a>
        </span>
      </footer>
    </div>
  );
}

export default App;
