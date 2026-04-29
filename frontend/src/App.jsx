import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TrendSparkline } from './TrendSparkline';
import './App.css';

function capitalize(s) { return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

// Display 0-100 score as whole number
function fmt(s) {
  return Math.round(s).toString();
}

// Convert 0-100 sentiment to plain English tone label + emoji
function toneLabel(s) {
  if (s <= 25)  return { label: 'Very Negative',       emoji: '🔴', color: '#ef4444', short: 'Crisis-level concern' };
  if (s <= 40)  return { label: 'Negative',            emoji: '🟠', color: '#f97316', short: 'More worry than hope' };
  if (s <= 48)  return { label: 'Slightly Negative',   emoji: '🟡', color: '#eab308', short: 'Leaning concerned' };
  if (s < 52)   return { label: 'Neutral',             emoji: '⚪', color: '#94a3b8', short: 'Balanced — no strong lean' };
  if (s < 60)   return { label: 'Slightly Positive',   emoji: '🟢', color: '#22c55e', short: 'Leaning hopeful' };
  if (s < 75)   return { label: 'Positive',            emoji: '💚', color: '#10b981', short: 'More optimism than concern' };
  return         { label: 'Very Positive',             emoji: '🟩', color: '#00ff88', short: 'Strong optimism' };
}

// ── Issue hierarchy ──
const TOP_ISSUES = [
  { key: 'healthcare', label: 'Health Care' },
  { key: 'education', label: 'Education' },
  { key: 'economy & jobs', label: 'Economy' },
  { key: 'cost of living', label: 'Cost of Living' },
  { key: 'property tax', label: 'Property Taxes' },
  { key: 'energy & grid', label: 'Energy' },
];

const OTHER_ISSUES = [
  { key: 'government accountability', label: 'Government Accountability' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'water & drought', label: 'Water' },
  { key: 'tech & innovation', label: 'Tech & Innovation' },
  { key: 'ai data centers', label: 'AI Data Centers' },
  { key: 'border security', label: 'Border Security' },
  { key: 'crime & safety', label: 'Crime & Safety' },
  { key: 'local control', label: 'Local Control' },
  { key: 'housing', label: 'Housing' },
  { key: 'thc & hemp', label: 'THC & Hemp' },
  { key: 'casinos & gambling', label: 'Casinos & Gambling' },
  { key: 'nuclear energy', label: 'Nuclear Energy' },
  { key: 'recycling', label: 'Recycling' },
  { key: 'public information', label: 'Public Info & Transparency' },
];

// Generate narrative summary from data
function generateSummary(data, topics) {
  if (!data || !topics || topics.length === 0) return '';
  const sorted = [...topics].filter(t => t.volume > 0);
  if (sorted.length === 0) return '';
  const mostPositive = sorted.sort((a, b) => b.sentiment - a.sentiment)[0];
  const mostNegative = [...sorted].sort((a, b) => a.sentiment - b.sentiment)[0];
  const tone = data.overallScore >= 52 ? 'optimistic' :
               data.overallScore <= 48 ? 'pessimistic' : 'mixed';
  const toneWords = {
    optimistic: 'Texans remain cautiously optimistic',
    pessimistic: 'Texans express growing concerns',
    mixed: 'Texans show mixed feelings',
  };
  const posLabel = TOP_ISSUES.find(i => i.key === mostPositive.name)?.label ||
                   OTHER_ISSUES.find(i => i.key === mostPositive.name)?.label ||
                   capitalize(mostPositive.name);
  const negLabel = TOP_ISSUES.find(i => i.key === mostNegative.name)?.label ||
                   OTHER_ISSUES.find(i => i.key === mostNegative.name)?.label ||
                   capitalize(mostNegative.name);
  return `${toneWords[tone]} as ${posLabel.toLowerCase()} sentiment leads (${fmt(mostPositive.sentiment)}) while ${negLabel.toLowerCase()} trails (${fmt(mostNegative.sentiment)}) across the state this week.`;
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
  const min = Math.min(40, ...scores);
  const max = Math.max(60, ...scores);
  const xScale = i => PAD + (i / (scores.length - 1)) * (W - PAD * 2);
  const yScale = v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const mid = yScale(50);
  const pts = scores.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
  const latest = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const delta = latest - prev;
  return (
    <div className="overall-sparkline">
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <line x1={PAD} x2={W - PAD} y1={mid} y2={mid} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <polyline points={pts} fill="none" stroke={latest >= 50 ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
        <circle cx={xScale(scores.length - 1)} cy={yScale(latest)} r="2.5" fill={latest >= 50 ? '#10b981' : '#ef4444'} />
      </svg>
      <span className={`sparkline-delta ${delta >= 0 ? 'pos' : 'neg'}`}>
        {delta >= 0 ? '▲' : '▼'} {Math.round(Math.abs(delta))} from last check
      </span>
    </div>
  );
}

/* ── Issue sparkline from history ── */
function IssueSparkline({ issueKey, history }) {
  if (!history || history.length === 0) return null;
  const scores = history
    .map(snap => snap.topics?.find(t => t.name === issueKey)?.sentiment ?? null)
    .filter(v => v !== null);
  if (scores.length === 0) return null;

  const W = 160, H = 32, PAD = 3;
  const latest = scores[scores.length - 1];
  const color = latest >= 50 ? '#10b981' : '#ef4444';

  if (scores.length === 1) {
    const cx = W / 2, cy = H / 2;
    return (
      <svg width={W} height={H} className="issue-sparkline-svg" style={{ overflow: 'visible' }}>
        <line x1={PAD} x2={W - PAD} y1={cy} y2={cy} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="3" fill={color} opacity="0.85" />
      </svg>
    );
  }

  const min = Math.min(40, ...scores);
  const max = Math.max(60, ...scores);
  const xScale = i => PAD + (i / (scores.length - 1)) * (W - PAD * 2);
  const yScale = v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const mid = yScale(50);
  const pts = scores.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');

  return (
    <svg width={W} height={H} className="issue-sparkline-svg" style={{ overflow: 'visible' }}>
      <line x1={PAD} x2={W - PAD} y1={mid} y2={mid} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
      <circle cx={xScale(scores.length - 1)} cy={yScale(latest)} r="2.5" fill={color} />
    </svg>
  );
}

/* ── Password Gate (removed — public access) ── */
function PasswordGate({ children }) {
  return children;
}

/* ── App ── */
function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('demo');
  const [staleInfo, setStaleInfo] = useState(null);
  const [entered, setEntered] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [timeRange, setTimeRange] = useState('30D');

  const RANGE_DAYS = { '14D': 14, '30D': 30, 'MAX': 90 };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const apiKey = import.meta.env.VITE_API_KEY || 'txs_embed_089e6a982d263fcc4d90c525fd0a1c33';

  useEffect(() => {
    const days = RANGE_DAYS[timeRange];
    fetch(`${apiUrl}/api/sentiment/history?days=${days}&key=${apiKey}`)
      .then(r => r.ok ? r.json() : [])
      .then(h => setHistory(h))
      .catch(() => {});
  }, [timeRange]);

  useEffect(() => {
    fetch(`${apiUrl}/api/sentiment/today?key=${apiKey}`)
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

  // Build a lookup of topic data from the API
  const topicLookup = {};
  (data?.topics || []).forEach(t => {
    topicLookup[t.name] = t;
  });

  // Get topic data for an issue, applying region filter if active
  function getIssueData(issueKey) {
    const t = topicLookup[issueKey];
    if (!t) return null;
    if (!selectedRegion) return t;
    const rd = t.byRegion?.[selectedRegion];
    if (!rd || rd.volume === 0) return null;
    return { ...t, sentiment: rd.sentiment, volume: rd.volume };
  }

  // Top 3 trending topics by volume
  const trendingTopics = (data?.topics || [])
    .filter(t => t.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3);

  const allTopics = (data?.topics || []).filter(t => t.volume > 0);
  const totalVolume = allTopics.reduce((s, t) => s + t.volume, 0);
  const regions = data?.regions || {};

  const dateStr = data?.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Today';

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
    const rows = [['Issue', 'Sentiment Score', 'Volume']];
    [...TOP_ISSUES, ...OTHER_ISSUES].forEach(issue => {
      const t = topicLookup[issue.key];
      if (t) rows.push([issue.label, Math.round(t.sentiment), t.volume]);
      else rows.push([issue.label, '', 0]);
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
      <PasswordGate>
        <div className="loading">
          <div className="loading-ring" />
          <div className="loading-text">Reading the room...</div>
        </div>
      </PasswordGate>
    );
  }

  if (dataSource === 'unavailable') {
    return (
      <PasswordGate>
        <div className="loading">
          <div className="loading-text" style={{ color: '#ef4444' }}>Data sources temporarily unavailable</div>
          <div className="loading-text" style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.6 }}>
            Reddit, Bluesky, YouTube, and news feeds are retrying. Check back shortly.
          </div>
        </div>
      </PasswordGate>
    );
  }

  return (
    <PasswordGate>
    <div className="app">
      <Particles />

      {/* ── TICKER BAR ── */}
      {data && (
        <div className="ticker-bar">
          <div className="ticker-track">
            <div className="ticker-content">
              {[...TOP_ISSUES, ...OTHER_ISSUES].map(issue => {
                const td = topicLookup[issue.key];
                if (!td || td.volume === 0) return null;
                return (
                  <span key={issue.key} className="ticker-item">
                    <span className="ticker-item-name">{issue.label}</span>
                    <span className={`ticker-item-score ${td.sentiment >= 50 ? 'pos' : 'neg'}`}>
                      {fmt(td.sentiment)}
                    </span>
                  </span>
                );
              })}
              {[...TOP_ISSUES, ...OTHER_ISSUES].map(issue => {
                const td = topicLookup[issue.key];
                if (!td || td.volume === 0) return null;
                return (
                  <span key={issue.key + '-dup'} className="ticker-item" aria-hidden="true">
                    <span className="ticker-item-name">{issue.label}</span>
                    <span className={`ticker-item-score ${td.sentiment >= 50 ? 'pos' : 'neg'}`}>
                      {fmt(td.sentiment)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          <span className="logo-powered">TEXAS<span style={{color:'#c7413f',margin:'0 0.3em'}}>•</span>DISPATCH</span>
        </div>
        <div className="header-center">
          <h1 className="site-title">TEXAS DISPATCH</h1>
          <p className="site-subtitle">Texas Political Sentiment Index</p>
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

      {/* Methodology note */}
      <div className="methodology-note">
        <span className="method-icon">ℹ</span>
        <span className="method-text">
          Overall score = volume-weighted average of category scores.
          <br />Updated Mar 2026 — previously engagement-weighted, which diluted small signals to zero.
        </span>
      </div>

      {(staleInfo || dataSource === 'unavailable') && (
        <div className={`status-banner ${staleInfo ? 'stale' : 'demo'}`}>
          {staleInfo ? (
            <>Showing cached data from {new Date(staleInfo.cachedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
          ) : (
            <>Data sources temporarily unavailable &middot; Retrying soon</>
          )}
        </div>
      )}

      {/* ── HERO AREA ── */}
      {data && (
        <div className={`hero ${entered ? 'entered' : ''}`}>
          <div className="hero-score">
            <div className="overall-label">Overall Texas Sentiment</div>
            <div className="tone-hero">
              <span className="tone-emoji">{toneLabel(data.overallScore).emoji}</span>
              <span className="tone-word" style={{ color: toneLabel(data.overallScore).color }}>
                {toneLabel(data.overallScore).label}
              </span>
            </div>
            <div className={`overall-value ${data.overallScore >= 50 ? 'pos' : 'neg'}`}>
              {fmt(data.overallScore)} <span className="score-scale">/ 100</span>
            </div>

            <div className="sentiment-gauge-wrap">
              <div className="sentiment-gauge">
                <div className="gauge-zone gauge-neg" />
                <div className="gauge-zone gauge-mid" />
                <div className="gauge-zone gauge-pos" />
                <div
                  className="gauge-needle"
                  style={{ left: `${data.overallScore}%` }}
                />
              </div>
              <div className="gauge-labels">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
            </div>

            <div className="sentiment-note">
              {toneLabel(data.overallScore).short}
            </div>

            <OverallSparkline history={history} />

            <div className="time-filter">
              {['14D', '30D', 'MAX'].map(r => (
                <button
                  key={r}
                  className={`time-chip ${timeRange === r ? 'active' : ''}`}
                  onClick={() => setTimeRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            {data.scoreDelta !== undefined && data.scoreDelta !== 0 && (
              <div className={`overall-delta ${data.scoreDelta > 0 ? 'pos' : 'neg'}`}>
                {data.scoreDelta > 0 ? '▲' : '▼'}{Math.round(Math.abs(data.scoreDelta))} from yesterday
              </div>
            )}
            <div className="overall-meta">
              {totalVolume.toLocaleString()} mentions &middot; 8 sources
              &nbsp;&middot;&nbsp;
              {history.length} {history.length === 1 ? 'snapshot' : 'snapshots'}
              {history.length > 0 && (
                <> ({Math.max(1, Math.round(history.length / 12))} {Math.round(history.length / 12) === 1 ? 'day' : 'days'} of data)</>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── SUMMARY ── */}
      {data && (
        <div className={`summary-bar ${entered ? 'entered' : ''}`}>
          <p className="summary-text">{generateSummary(data, allTopics)}</p>
        </div>
      )}

      {/* ── HOW TO READ THIS ── */}
      {data && (
        <div className={`reading-key ${entered ? 'entered' : ''}`}>
          <div className="reading-key-title">How to read these scores</div>
          <div className="reading-key-grid">
            <div className="key-item"><span className="key-dot" style={{background:'#ef4444'}} />
              <div><strong>0–25 · Very Negative</strong><br/>Crisis dominates — a major event is driving anger or fear</div>
            </div>
            <div className="key-item"><span className="key-dot" style={{background:'#f97316'}} />
              <div><strong>25–40 · Negative</strong><br/>Concerns outweigh optimism on this issue</div>
            </div>
            <div className="key-item"><span className="key-dot" style={{background:'#eab308'}} />
              <div><strong>40–48 · Slightly Negative</strong><br/>Mild worry — something is drawing criticism</div>
            </div>
            <div className="key-item"><span className="key-dot" style={{background:'#94a3b8'}} />
              <div><strong>48–52 · Neutral</strong><br/>Normal baseline — no strong lean either way</div>
            </div>
            <div className="key-item"><span className="key-dot" style={{background:'#22c55e'}} />
              <div><strong>52–60 · Slightly Positive</strong><br/>Mild optimism — good news or reform talk</div>
            </div>
            <div className="key-item"><span className="key-dot" style={{background:'#10b981'}} />
              <div><strong>60–75 · Positive</strong><br/>Clear optimism — an issue is generating hope</div>
            </div>
            <div className="key-item"><span className="key-dot" style={{background:'#00ff88'}} />
              <div><strong>75–100 · Very Positive</strong><br/>Rare — usually a specific breakthrough or relief event</div>
            </div>
          </div>
          <div className="reading-key-footer">
            Scores are based on keyword analysis of {data.totalVolume?.toLocaleString()} social media posts, news articles, and public comments from 9 sources across Texas. This measures <em>language tone</em>, not public opinion polls. Most scores stay between 40 and 60 — that's normal.
          </div>
        </div>
      )}

      {/* ── REGION FILTER ── */}
      <div className={`region-filter ${entered ? 'entered' : ''}`}>
        <button
          className={`region-chip ${!selectedRegion ? 'active' : ''}`}
          onClick={() => { setSelectedRegion(null); setSelectedIssue(null); }}
        >
          All Texas
        </button>
        {Object.entries(regions).map(([id, label]) => (
          <button
            key={id}
            className={`region-chip ${selectedRegion === id ? 'active' : ''}`}
            onClick={() => { setSelectedRegion(id); setSelectedIssue(null); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="main">
        <div className="content-wrapper">

          {/* CENTER: Top 6 Issues */}
          <div className="center-col">
            <h2 className="section-heading">Top Issues</h2>
            <div className="top-issues-grid">
              {TOP_ISSUES.map((issue, idx) => {
                const td = getIssueData(issue.key);
                const hasData = td && td.volume > 0;
                const isSelected = selectedIssue === issue.key;
                return (
                  <button
                    key={issue.key}
                    className={`top-issue-card ${hasData ? (td.sentiment >= 50 ? 'pos' : 'neg') : 'no-data'} ${isSelected ? 'selected' : ''} ${entered ? 'entered' : ''}`}
                    style={{ '--card-delay': `${idx * 0.08}s` }}
                    onClick={() => hasData && setSelectedIssue(isSelected ? null : issue.key)}
                  >
                    <div className="top-issue-header">
                      <span className="top-issue-name">{issue.label}</span>
                      {hasData && td.delta !== undefined && td.delta !== 0 && (
                        <span className={`top-issue-delta ${td.delta > 0 ? 'pos' : 'neg'}`}>
                          {td.delta > 0 ? '▲' : '▼'}{Math.round(Math.abs(td.delta))}
                        </span>
                      )}
                    </div>
                    {hasData ? (
                      <>
                        <div className={`top-issue-score ${td.sentiment >= 50 ? 'pos' : 'neg'}`}>
                          {fmt(td.sentiment)}
                        </div>
                        <div className="top-issue-tone" style={{ color: toneLabel(td.sentiment).color }}>
                          {toneLabel(td.sentiment).emoji} {toneLabel(td.sentiment).label}
                        </div>
                        <IssueSparkline issueKey={issue.key} history={history} />
                        <div className="top-issue-footer">
                          <span className="top-issue-vol">{td.volume.toLocaleString()} mentions</span>
                        </div>
                      </>
                    ) : (
                      <div className="top-issue-empty">
                        <div className="empty-score">--</div>
                        <div className="empty-bar" />
                        <span className="empty-label">Collecting data</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR: Other Issues */}
          <div className="sidebar">
            <h2 className="section-heading">Other Issues</h2>
            <div className="other-issues-grid">
              {OTHER_ISSUES.map((issue, idx) => {
                const td = getIssueData(issue.key);
                const hasData = td && td.volume > 0;
                const isSelected = selectedIssue === issue.key;
                return (
                  <button
                    key={issue.key}
                    className={`mini-card ${hasData ? (td.sentiment >= 50 ? 'pos' : 'neg') : 'no-data'} ${isSelected ? 'selected' : ''} ${entered ? 'entered' : ''}`}
                    style={{ '--row-delay': `${idx * 0.04}s` }}
                    onClick={() => hasData && setSelectedIssue(isSelected ? null : issue.key)}
                  >
                    <span className="mini-card-name">{issue.label}</span>
                    {hasData ? (
                      <>
                        <span className={`mini-card-score ${td.sentiment >= 50 ? 'pos' : 'neg'}`}>
                          {fmt(td.sentiment)}
                        </span>
                        <span className="mini-card-vol">{td.volume.toLocaleString()} mentions</span>
                      </>
                    ) : (
                      <>
                        <span className="mini-card-score no-data">--</span>
                        <span className="mini-card-vol no-data">Collecting data</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

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
              <h3 className="context-title">Share &amp; Export</h3>
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
            </div>
          </div>
        </div>

        {/* DETAIL PANEL — issue drill-down */}
        {selectedIssue && topicLookup[selectedIssue] && (() => {
          const topic = topicLookup[selectedIssue];
          const label = TOP_ISSUES.find(i => i.key === selectedIssue)?.label ||
                        OTHER_ISSUES.find(i => i.key === selectedIssue)?.label ||
                        capitalize(selectedIssue);
          return (
            <section className="detail" key={selectedIssue}>
              <div className="detail-top">
                <h3>{label}</h3>
                <button className="detail-close" onClick={() => setSelectedIssue(null)}>&times;</button>
              </div>
              <div className="detail-nums">
                <div className="detail-num">
                  <span className={`detail-big ${topic.sentiment >= 50 ? 'pos' : 'neg'}`}>
                    {fmt(topic.sentiment)}
                  </span>
                  <span className="detail-label">Sentiment</span>
                </div>
                <div className="detail-num">
                  <span className="detail-big">{topic.volume.toLocaleString()}</span>
                  <span className="detail-label">Mentions</span>
                </div>
              </div>

              {/* Regional breakdown */}
              {!selectedRegion && topic.byRegion && Object.keys(topic.byRegion).length > 0 && (
                <div className="detail-regions">
                  <div className="detail-label" style={{ marginBottom: '0.75rem' }}>By Region</div>
                  <div className="region-bars">
                    {Object.entries(topic.byRegion)
                      .filter(([, rd]) => rd.volume > 0)
                      .sort((a, b) => b[1].volume - a[1].volume)
                      .map(([regId, rd]) => (
                        <div key={regId} className="region-bar-row">
                          <span className="region-bar-label">{regions[regId] || regId}</span>
                          <div className="region-bar-track">
                            <div
                              className={`region-bar-fill ${rd.sentiment >= 50 ? 'pos' : 'neg'}`}
                              style={{ width: `${Math.min(rd.sentiment, 100)}%` }}
                            />
                          </div>
                          <span className={`region-bar-value ${rd.sentiment >= 50 ? 'pos' : 'neg'}`}>
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
                <TrendSparkline topic={selectedIssue} dark />
              </div>

              {/* Real mentions from collected data */}
              {topic.topMentions?.length > 0 && (
                <div className="detail-mentions">
                  <div className="detail-label" style={{ marginBottom: '0.75rem' }}>Recent Mentions</div>
                  {topic.topMentions.map((m, i) => (
                    <div key={i} className="mention">
                      <span className="mention-text">&ldquo;{m.text}&rdquo;</span>
                      <span className="mention-src">
                        {m.source || 'unknown'}
                        {m.region && regions[m.region] ? ` · ${regions[m.region]}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })()}
      </main>

      <section className="methodology">
        <details>
          <summary>How scores are calculated</summary>
          <div className="methodology-body">
            <p><strong>What the score means:</strong> Scores run from &minus;10 (strongly negative) to +10 (strongly positive), with 0 as neutral. A score of +0.4 means slightly more positive language than negative across all sources — typical for everyday political discourse.</p>
            <p><strong>Data sources (8 total):</strong> Reddit (10+ subreddits), Bluesky, Mastodon, YouTube comments, Google Trends (TX), Texas Tribune / Texas Observer / Texas Standard / Texas Scorecard / Texas Monthly (RSS), Breitbart Texas / Texas Policy Foundation / TX Right to Life (conservative RSS), and local TV news (KHOU, KVUE, WFAA, KENS5, KXAN). Refreshed every 2 hours.</p>
            <p><strong>21 tracked issues:</strong> 6 top issues (Health Care, Education, Economy, Cost of Living, Property Taxes, Energy) plus 15 additional issues covering government accountability, infrastructure, border security, emerging topics like THC &amp; Hemp, nuclear energy, casinos &amp; gambling, and more.</p>
            <p><strong>Sentiment method:</strong> Each post is scored by counting positive and negative words from a Texas-politics vocabulary. Negation is handled — &ldquo;not good&rdquo; counts as negative. The overall score is weighted by engagement (upvotes, likes, comment count).</p>
            <p><strong>What it isn&rsquo;t:</strong> This is not a poll. It reflects the language people use online, not voting intent. Best read as a directional signal — what issues are generating heat, and whether the language leans positive or negative.</p>
          </div>
        </details>
      </section>

      <footer className="footer">
        <span>
          {staleInfo ? 'Cached data' : 'Reddit · Bluesky · Mastodon · YouTube · Texas news · Google Trends'}
          &nbsp;&middot;&nbsp;8 sources&nbsp;&middot;&nbsp;Refreshed every 2 hours
        </span>
        <span>
          A <a href="https://thetexasdispatch.com" target="_blank" rel="noopener">Texas Dispatch</a> project powered by{' '}
          <a href="https://localinsights.ai" target="_blank" rel="noopener">LocalInsights.ai</a>
        </span>
      </footer>
    </div>
    </PasswordGate>
  );
}

export default App;
