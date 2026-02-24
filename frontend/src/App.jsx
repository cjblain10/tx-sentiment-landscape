import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TrendSparkline } from './TrendSparkline';
import './App.css';

function capitalize(s) { return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

// Scale raw sentiment (-1..1) to display score (-10..10)
function fmt(s) {
  const scaled = s * 10;
  return (scaled >= 0 ? '+' : '') + scaled.toFixed(1);
}

// Generate narrative summary from data
function generateSummary(data) {
  if (!data || !data.categories) return '';
  const categories = data.categories;
  const mostPositive = [...categories].sort((a, b) => b.sentiment - a.sentiment)[0];
  const mostNegative = [...categories].sort((a, b) => a.sentiment - b.sentiment)[0];
  const tone = data.overallScore >= 0.03 ? 'optimistic' :
               data.overallScore <= -0.03 ? 'pessimistic' : 'mixed';
  const toneWords = {
    optimistic: 'Texans remain cautiously optimistic',
    pessimistic: 'Texans express growing concerns',
    mixed: 'Texans show mixed feelings',
  };
  return `${toneWords[tone]} as ${mostPositive.name.toLowerCase()} sentiment leads (${fmt(mostPositive.sentiment)}) while ${mostNegative.name.toLowerCase()} trails (${fmt(mostNegative.sentiment)}) across the state this week.`;
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

/* ── Overall sparkline ── */
function OverallSparkline({ history }) {
  if (!history || history.length === 0) return null;
  const W = 200, H = 40, PAD = 4;
  const scores = history.map(s => s.overallScore);
  const min = Math.min(-0.1, ...scores);
  const max = Math.max(0.1, ...scores);
  const xScale = i => PAD + (i / (scores.length - 1)) * (W - PAD * 2);
  const yScale = v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const zero = yScale(0);
  const pts = scores.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
  const latest = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const delta = latest - prev;
  return (
    <div className="overall-sparkline">
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <line x1={PAD} x2={W - PAD} y1={zero} y2={zero} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <polyline points={pts} fill="none" stroke={latest >= 0 ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
        <circle cx={xScale(scores.length - 1)} cy={yScale(latest)} r="2.5" fill={latest >= 0 ? '#10b981' : '#ef4444'} />
      </svg>
      <span className={`sparkline-delta ${delta >= 0 ? 'pos' : 'neg'}`}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 10).toFixed(1)} from last check
      </span>
    </div>
  );
}

/* ── Category sparkline from history ── */
function CategorySparkline({ categoryName, history }) {
  if (!history || history.length === 0) return null;
  const scores = history
    .map(snap => snap.categories?.find(c => c.name === categoryName)?.sentiment ?? null)
    .filter(v => v !== null);
  if (scores.length === 0) return null;

  const W = 160, H = 32, PAD = 3;
  const latest = scores[scores.length - 1];
  const color = latest >= 0 ? '#10b981' : '#ef4444';

  // Single point — just show a dot on the zero line
  if (scores.length === 1) {
    const cx = W / 2;
    const cy = H / 2;
    return (
      <svg width={W} height={H} className="cat-sparkline-svg" style={{ overflow: 'visible' }}>
        <line x1={PAD} x2={W - PAD} y1={cy} y2={cy} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="3" fill={color} opacity="0.85" />
      </svg>
    );
  }

  const min = Math.min(-0.05, ...scores);
  const max = Math.max(0.05, ...scores);
  const xScale = i => PAD + (i / (scores.length - 1)) * (W - PAD * 2);
  const yScale = v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const zero = yScale(0);
  const pts = scores.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');

  return (
    <svg width={W} height={H} className="cat-sparkline-svg" style={{ overflow: 'visible' }}>
      <line x1={PAD} x2={W - PAD} y1={zero} y2={zero} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
      <circle cx={xScale(scores.length - 1)} cy={yScale(latest)} r="2.5" fill={color} />
    </svg>
  );
}

/* ── App ── */
function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('demo');
  const [staleInfo, setStaleInfo] = useState(null);
  const [entered, setEntered] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetch(`${apiUrl}/api/sentiment/history?days=30`)
      .then(r => r.ok ? r.json() : [])
      .then(h => setHistory(h))
      .catch(() => {});
    fetch(`${apiUrl}/api/sentiment/today`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setData(null); setDataSource('unavailable'); }
        else {
          setData(d);
          setDataSource(d.source || 'live');
          if (d.stale) setStaleInfo({ cachedAt: d.cachedAt });
        }
        setLoading(false);
      })
      .catch(() => { setData(null); setDataSource('unavailable'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!loading) { const t = setTimeout(() => setEntered(true), 50); return () => clearTimeout(t); }
  }, [loading]);

  const topics = (data?.topics || []).map(t => {
    if (!selectedRegion) return t;
    const rd = t.byRegion?.[selectedRegion];
    if (!rd || rd.volume === 0) return null;
    return { ...t, sentiment: rd.sentiment, volume: rd.volume };
  }).filter(Boolean).sort((a, b) => b.volume - a.volume);

  // When a category is selected, filter topic nodes to that category's sub-topics
  const visibleTopics = selectedCategory
    ? topics.filter(t => {
        const cat = data?.categories?.find(c => c.name === selectedCategory);
        return cat?.topics?.includes(t.name);
      })
    : topics;

  const totalVolume = topics.reduce((s, t) => s + t.volume, 0);
  const regions = data?.regions || {};

  const dateStr = data?.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Today';

  const handleSelectTopic = useCallback((name) => {
    setSelectedTopic(prev => prev?.name === name ? null : topics.find(t => t.name === name));
  }, [topics]);

  function handleShare() {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopyMsg('Copied!');
        setTimeout(() => setCopyMsg(''), 2000);
      });
    }
  }

  function handleExportCSV() {
    if (!data) return;
    const rows = [['Topic', 'Sentiment Score', 'Volume', 'Category']];
    data.categories?.forEach(cat => {
      (cat.topics || []).forEach(topicName => {
        const t = topics.find(x => x.name === topicName);
        if (t) rows.push([t.name, (t.sentiment * 10).toFixed(2), t.volume, cat.name]);
      });
    });
    // Add topics not in any category
    topics.forEach(t => {
      const inCat = data.categories?.some(c => c.topics?.includes(t.name));
      if (!inCat) rows.push([t.name, (t.sentiment * 10).toFixed(2), t.volume, '']);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `texas-sentiment-${data.date || 'today'}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-ring" />
        <div className="loading-text">Reading the room...</div>
      </div>
    );
  }

  if (dataSource === 'unavailable') {
    return (
      <div className="loading">
        <div className="loading-text" style={{ color: '#ef4444' }}>Data sources temporarily unavailable</div>
        <div className="loading-text" style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.6 }}>
          Reddit, Bluesky, YouTube, and news feeds are retrying. Check back shortly.
        </div>
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
          <span className="logo-divider">×</span>
          <span className="logo-powered">LocalInsights.ai</span>
        </div>
        <div className="header-center">
          <h1 className="site-title">LONE STAR PULSE</h1>
          <p className="site-subtitle">Texas Public Sentiment Index</p>
        </div>
        <div className="header-right">
          <div className="header-actions">
            <button className="hdr-btn" onClick={handleShare} title="Copy link to share">
              {copyMsg || '⤴ Share'}
            </button>
            <button className="hdr-btn" onClick={handleExportCSV} title="Download CSV">
              ↓ CSV
            </button>
            <div className="live-badge">
              <span className={`live-dot ${(dataSource === 'unavailable' || staleInfo) ? 'dim' : ''}`} />
              {staleInfo ? 'CACHED' : dataSource === 'unavailable' ? 'OFFLINE' : 'LIVE'} &middot; {dateStr}
            </div>
          </div>
        </div>
      </header>

      {(staleInfo || dataSource === 'unavailable') && (
        <div className={`status-banner ${staleInfo ? 'stale' : 'demo'}`}>
          {staleInfo ? (
            <>Showing cached data from {new Date(staleInfo.cachedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
          ) : (
            <>Data sources temporarily unavailable &middot; Retrying soon</>
          )}
        </div>
      )}

      {/* SUMMARY PARAGRAPH — prominent, above the fold */}
      {data && (
        <div className={`summary-bar ${entered ? 'entered' : ''}`}>
          <p className="summary-text">{generateSummary(data)}</p>
        </div>
      )}

      <main className="main">
        <div className="content-wrapper">
          {/* LEFT/CENTER: VISUALIZATION */}
          <div className="viz-area">
            {/* OVERALL SCORE */}
            {data && (
              <div className={`overall-score ${entered ? 'entered' : ''}`}>
                <div className="overall-label">Overall Texas Sentiment</div>
                <div className={`overall-value ${data.overallScore >= 0 ? 'pos' : 'neg'}`}>
                  {fmt(data.overallScore)}
                </div>
                <div className="overall-scale">out of ±10</div>
                <OverallSparkline history={history} />
                {data.scoreDelta !== undefined && data.scoreDelta !== 0 && (
                  <div className={`overall-delta ${data.scoreDelta > 0 ? 'pos' : 'neg'}`}>
                    {data.scoreDelta > 0 ? '▲' : '▼'}{Math.abs(data.scoreDelta * 10).toFixed(1)} from yesterday
                  </div>
                )}
                <div className="overall-meta">
                  {totalVolume.toLocaleString()} mentions &middot; 8 sources &middot; {history.length} days tracked
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

            {/* 4 CATEGORY CARDS — primary view */}
            {data?.categories && data.categories.length > 0 && (
              <div className={`category-grid ${entered ? 'entered' : ''}`}>
                {data.categories.map((cat, idx) => {
                  const isPos = cat.sentiment >= 0;
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      className={`cat-card ${isPos ? 'pos' : 'neg'} ${isSelected ? 'selected' : ''}`}
                      style={{ '--cat-delay': `${idx * 0.1}s` }}
                      onClick={() => {
                        setSelectedCategory(prev => prev === cat.name ? null : cat.name);
                        setSelectedTopic(null);
                      }}
                    >
                      <div className="cat-card-header">
                        <span className="cat-card-name">{cat.name}</span>
                        {cat.delta !== undefined && cat.delta !== 0 && (
                          <span className={`cat-card-delta ${cat.delta > 0 ? 'pos' : 'neg'}`}>
                            {cat.delta > 0 ? '▲' : '▼'}{Math.abs(cat.delta * 10).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className={`cat-card-score ${isPos ? 'pos' : 'neg'}`}>
                        {fmt(cat.sentiment)}
                      </div>
                      <CategorySparkline categoryName={cat.name} history={history} />
                      <div className="cat-card-footer">
                        <span className="cat-card-vol">{cat.volume.toLocaleString()} mentions</span>
                        <span className="cat-card-topics">
                          {(cat.topics || []).map(t => capitalize(t)).join(' · ')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TOPIC DRILL-DOWN HEADER */}
            {selectedCategory && (
              <div className="drill-header">
                <span className="drill-label">Topics in {selectedCategory}</span>
                <button className="drill-clear" onClick={() => { setSelectedCategory(null); setSelectedTopic(null); }}>
                  &times; Show All
                </button>
              </div>
            )}

            {/* PULSE GRID — topic nodes */}
            <div className="pulse-grid">
              {visibleTopics.map((topic, idx) => {
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
                      <span className="node-score">{fmt(topic.sentiment)}</span>
                      <span className="node-vol">{topic.volume.toLocaleString()} mentions</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="sidebar">
            {/* BIGGEST SWINGS */}
            {data?.biggestMovers && data.biggestMovers.length > 0 && (
              <div className={`context-box movers-box ${entered ? 'entered' : ''}`}>
                <h3 className="context-title">Biggest Swings Today</h3>
                <div className="context-list">
                  {data.biggestMovers.map((topic, idx) => {
                    const isPos = topic.sentiment >= 0;
                    const deltaIsPos = topic.delta > 0;
                    return (
                      <div key={topic.name} className="context-item" style={{ '--delay': `${idx * 0.08}s` }}>
                        <div className="context-item-header">
                          <span className="context-item-name">{capitalize(topic.name)}</span>
                          <span className={`context-item-delta ${deltaIsPos ? 'pos' : 'neg'}`}>
                            {deltaIsPos ? '▲' : '▼'}{Math.abs(topic.delta * 10).toFixed(1)}
                          </span>
                        </div>
                        <div className={`context-item-score ${isPos ? 'pos' : 'neg'}`}>
                          {fmt(topic.sentiment)}
                        </div>
                        <div className="context-item-meta">{topic.volume.toLocaleString()} mentions</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SOURCE ATTRIBUTION */}
            <div className={`context-box source-box ${entered ? 'entered' : ''}`}>
              <h3 className="context-title">Data Sources</h3>
              <div className="source-chips">
                {['Reddit', 'Bluesky', 'Mastodon', 'YouTube', 'Texas Tribune', 'Texas Standard', 'Breitbart TX', 'Google Trends'].map(src => (
                  <span key={src} className="source-chip">{src}</span>
                ))}
              </div>
              <p className="source-meta">8 sources &middot; Refreshed every 2 hours &middot; TX-focused keywords</p>
            </div>

            {/* SHARE & EXPORT */}
            <div className={`context-box share-box ${entered ? 'entered' : ''}`}>
              <h3 className="context-title">Share & Export</h3>
              <div className="share-actions">
                <button className="share-action-btn" onClick={handleShare}>
                  {copyMsg ? '✓ Link copied!' : '⤴ Copy link'}
                </button>
                <button className="share-action-btn" onClick={handleExportCSV}>
                  ↓ Download CSV
                </button>
                <a
                  href={`${apiUrl}/api/sentiment/ticker`}
                  className="share-action-btn api-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {'</>'} API &middot; Ticker embed
                </a>
              </div>
              <p className="source-meta" style={{ marginTop: '0.75rem' }}>
                Embed the ticker on any page via the JSON API endpoint.
              </p>
            </div>
          </div>
        </div>

        {/* DETAIL PANEL — topic drill-down */}
        {selectedTopic && (
          <section className="detail" key={selectedTopic.name}>
            <div className="detail-top">
              <h3>{capitalize(selectedTopic.name)}</h3>
              <button className="detail-close" onClick={() => setSelectedTopic(null)}>&times;</button>
            </div>
            <div className="detail-nums">
              <div className="detail-num">
                <span className={`detail-big ${selectedTopic.sentiment >= 0 ? 'pos' : 'neg'}`}>
                  {fmt(selectedTopic.sentiment)}
                </span>
                <span className="detail-label">Sentiment</span>
              </div>
              <div className="detail-num">
                <span className="detail-big">{selectedTopic.volume.toLocaleString()}</span>
                <span className="detail-label">Mentions</span>
              </div>
            </div>

            {/* Regional breakdown */}
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
                            style={{ width: `${Math.min(Math.abs(rd.sentiment) * 1000, 100)}%` }}
                          />
                        </div>
                        <span className={`region-bar-value ${rd.sentiment >= 0 ? 'pos' : 'neg'}`}>
                          {fmt(rd.sentiment)}
                        </span>
                        <span className="region-bar-vol">{rd.volume}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 30-day trend */}
            <div className="detail-trend">
              <TrendSparkline topic={selectedTopic.name} dark />
            </div>

            {/* Sample mentions */}
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

      <section className="methodology">
        <details>
          <summary>How scores are calculated</summary>
          <div className="methodology-body">
            <p><strong>What the score means:</strong> Scores run from −10 (strongly negative) to +10 (strongly positive), with 0 as neutral. A score of +0.4 means slightly more positive language than negative across all sources — typical for everyday political discourse, which tends toward measured or mixed framing.</p>
            <p><strong>Data sources (8 total):</strong> Reddit (r/Texas, r/Houston, r/Austin + 10 subreddits), Bluesky, Mastodon, YouTube comments, Google Trends (TX), Texas Tribune / Texas Observer / Texas Standard / Texas Scorecard / Texas Monthly (RSS), Breitbart Texas / Texas Policy Foundation / TX Right to Life (conservative RSS), and local TV news (KHOU, KVUE, WFAA, KENS5, KXAN). Refreshed every 2 hours.</p>
            <p><strong>Sentiment method:</strong> Each post is scored by counting positive and negative words from a Texas-politics vocabulary. Negation is handled — &ldquo;not good&rdquo; counts as negative. The overall score is weighted by engagement (upvotes, likes, comment count) so high-engagement posts carry more weight.</p>
            <p><strong>4 categories:</strong> Topics are grouped into Cost of Living (housing, property tax), Economy (economy &amp; jobs), Healthcare, and Education. Category scores are volume-weighted averages of their constituent topics.</p>
            <p><strong>What it isn&rsquo;t:</strong> This is not a poll. It reflects the language people use online, not their voting intent. Sources skew toward politically engaged users. Best read as a directional signal — what issues are generating heat, and whether the language leans positive or negative.</p>
          </div>
        </details>
      </section>

      <footer className="footer">
        <span>
          {staleInfo ? 'Cached data' : 'Reddit · Bluesky · Mastodon · YouTube · Texas news · Google Trends'}
          &nbsp;&middot;&nbsp;8 sources&nbsp;&middot;&nbsp;Refreshed every 2 hours
        </span>
        <span>
          A <a href="https://lonestarstandard.com" target="_blank" rel="noopener">Lone Star Standard</a> project powered by{' '}
          <a href="https://localinsights.ai" target="_blank" rel="noopener">LocalInsights.ai</a>
        </span>
      </footer>
    </div>
  );
}

export default App;
