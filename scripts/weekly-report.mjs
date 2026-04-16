/**
 * Weekly TX Sentiment Monitor Report
 * Fetches 7 days of history, generates narrative analysis via Claude,
 * emails to CB + Michael via Resend.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY
 *   RESEND_API_KEY
 *   SENTIMENT_API_KEY   (data key for the sentiment API)
 *
 * Optional:
 *   REPORT_FROM         (default: Texas Dispatch <reports@thetexasdispatch.com>)
 *   SENTIMENT_API_URL   (default: https://tx-sentinel-api.onrender.com)
 */

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const API_URL = process.env.SENTIMENT_API_URL || 'https://tx-sentinel-api.onrender.com';
const API_KEY = process.env.SENTIMENT_API_KEY || 'txs_data_94313aabf9fcea306befa72ef4419075';

const TO = ['charles@urbanreform.org', 'michaelrsearle@gmail.com'];
const FROM = process.env.REPORT_FROM || 'Texas Dispatch <reports@thetexasdispatch.com>';

// ── Fetch 7 days of history ──────────────────────────────────────────────────
async function fetchHistory() {
  const url = `${API_URL}/api/sentiment/history?days=7&key=${API_KEY}`;
  console.log(`Fetching history from ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API returned ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Compute weekly averages from history snapshots ───────────────────────────
function computeWeeklyStats(snapshots) {
  if (!snapshots.length) throw new Error('No snapshots returned for past 7 days');

  const overallScores = snapshots.map(s => s.overallScore);
  const avgOverall = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
  const minOverall = Math.min(...overallScores);
  const maxOverall = Math.max(...overallScores);

  // Earliest vs latest for week delta
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const weekDelta = last.overallScore - first.overallScore;

  // Aggregate categories across all snapshots
  const catMap = {};
  for (const snap of snapshots) {
    for (const cat of (snap.categories || [])) {
      if (!catMap[cat.name]) catMap[cat.name] = [];
      catMap[cat.name].push(cat.sentiment);
    }
  }
  const categories = Object.entries(catMap).map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    min: Math.min(...scores),
    max: Math.max(...scores),
    trend: scores[scores.length - 1] - scores[0],
  })).sort((a, b) => b.avg - a.avg);

  // Aggregate topics (14 issue areas) across all snapshots
  const topicMap = {};
  for (const snap of snapshots) {
    for (const t of (snap.topics || [])) {
      if (!topicMap[t.name]) topicMap[t.name] = [];
      topicMap[t.name].push(t.sentiment);
    }
  }
  const topics = Object.entries(topicMap).map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    trend: scores[scores.length - 1] - scores[0],
    volume: snapshots.reduce((sum, s) => {
      const t = (s.topics || []).find(x => x.name === name);
      return sum + (t?.volume || 0);
    }, 0),
  })).sort((a, b) => b.volume - a.volume);

  const totalVolume = snapshots.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
  const snapshotCount = snapshots.length;
  const dateRange = {
    from: first.date,
    to: last.date,
  };

  return { avgOverall, minOverall, maxOverall, weekDelta, categories, topics, totalVolume, snapshotCount, dateRange };
}

// ── Format date for display ───────────────────────────────────────────────────
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });
}

function fmtScore(n) {
  return Math.round(n * 10) / 10;
}

function fmtTrend(n) {
  if (n > 0.5) return `↑ +${fmtScore(n)}`;
  if (n < -0.5) return `↓ ${fmtScore(n)}`;
  return `→ flat`;
}

// ── Generate narrative via Claude ─────────────────────────────────────────────
async function generateReport(stats) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const dataBlock = `
WEEK: ${fmtDate(stats.dateRange.from)} – ${fmtDate(stats.dateRange.to)}
SNAPSHOTS: ${stats.snapshotCount} (collected every 2 hours)
TOTAL POSTS ANALYZED: ${stats.totalVolume.toLocaleString()}

OVERALL TEXAS SENTIMENT
  Average score: ${fmtScore(stats.avgOverall)} (scale: −10 worst, +10 best; 0 = neutral)
  Range: ${fmtScore(stats.minOverall)} to ${fmtScore(stats.maxOverall)}
  Week trend: ${fmtTrend(stats.weekDelta)}

REPORTING CATEGORIES (4 areas)
${stats.categories.map(c => `  ${c.name}: avg ${fmtScore(c.avg)}, range ${fmtScore(c.min)}–${fmtScore(c.max)}, trend ${fmtTrend(c.trend)}`).join('\n')}

14 ISSUE AREAS (by volume)
${stats.topics.map(t => `  ${t.name}: avg ${fmtScore(t.avg)}, trend ${fmtTrend(t.trend)}, ${t.volume.toLocaleString()} posts`).join('\n')}
`;

  const prompt = `You are the lead analyst for Texas Dispatch, a Texas political intelligence service used by political consultants and communications strategists. Write the weekly Texas Sentiment Monitor report for the week of ${fmtDate(stats.dateRange.from)} to ${fmtDate(stats.dateRange.to)}.

The data is from real-time social media and news monitoring across Texas (Reddit, Bluesky, Mastodon, YouTube comments, Texas news RSS, local TV news). Sentiment scores run from −10 (crisis-level negativity) to +10 (strong optimism); the normal baseline for political content is −1 to +1.

${dataBlock}

Write the report in this exact structure:

1. EXECUTIVE SUMMARY (3–4 sentences): Overall Texas political mood for the week. Lead with the headline number and what drove it. What was the dominant narrative?

2. FOUR REPORTING CATEGORIES: For each of the 4 categories (Cost of Living, Economy, Health Care, Education), write 2–3 sentences explaining the score, any notable trend, and what it signals for political communications.

3. HOT ISSUES — TOP 5: Pick the 5 most significant issue areas based on score extremes or notable trends. For each, write 1–2 sentences on what the signal means for Searle's clients.

4. QUIET ISSUES — NOTABLE LOWS: Identify 2–3 issue areas with low volume or neutral scores that Michael should watch as potential wildcards.

5. STRATEGIC TAKEAWAYS (3 bullets): Specific, actionable insights for a political consultant working in Texas right now.

Tone: authoritative, direct, analytical. No fluff. Write as if Michael Searle is going to use this in a client briefing Monday morning. Do not use phrases like "it's worth noting" or "it's important to consider." Be specific.`;

  console.log('Generating report via Claude...');
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

// ── Build HTML email ──────────────────────────────────────────────────────────
function buildEmailHtml(narrative, stats) {
  const weekLabel = `${fmtDate(stats.dateRange.from)} – ${fmtDate(stats.dateRange.to)}`;
  const overallColor = stats.avgOverall > 1 ? '#16a34a' : stats.avgOverall < -1 ? '#dc2626' : '#c7413f';

  const catRows = stats.categories.map(c => {
    const trendColor = c.trend > 0.5 ? '#16a34a' : c.trend < -0.5 ? '#dc2626' : '#6b7280';
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:500;">${c.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center;">${fmtScore(c.avg)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center;color:${trendColor};">${fmtTrend(c.trend)}</td>
    </tr>`;
  }).join('');

  const topicRows = stats.topics.slice(0, 14).map(t => {
    const trendColor = t.trend > 0.5 ? '#16a34a' : t.trend < -0.5 ? '#dc2626' : '#6b7280';
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${t.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:center;">${fmtScore(t.avg)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:center;color:${trendColor};">${fmtTrend(t.trend)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;color:#6b7280;">${t.volume.toLocaleString()}</td>
    </tr>`;
  }).join('');

  // Convert narrative plain text to HTML paragraphs
  const narrativeHtml = narrative
    .split('\n\n')
    .map(para => {
      if (para.match(/^\d+\.\s+[A-Z]/)) {
        // Section header
        const [header, ...rest] = para.split('\n');
        return `<h3 style="font-size:15px;font-weight:700;margin:24px 0 8px;color:#262626;text-transform:uppercase;letter-spacing:0.05em;">${header}</h3><p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#374151;">${rest.join('<br>')}</p>`;
      }
      if (para.startsWith('•') || para.startsWith('-')) {
        const items = para.split('\n').map(l => `<li style="margin-bottom:8px;">${l.replace(/^[•\-]\s*/, '')}</li>`).join('');
        return `<ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#374151;line-height:1.6;">${items}</ul>`;
      }
      return `<p style="margin:0 0 12px;line-height:1.6;font-size:14px;color:#374151;">${para}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;padding:20px;background:#fff;color:#1a1a1a;">

<!-- Header -->
<div style="border-top:4px solid #c7413f;padding-top:16px;margin-bottom:24px;">
  <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
    <span style="font-size:22px;font-weight:900;letter-spacing:0.1em;color:#262626;">TEXAS</span>
    <span style="font-size:16px;font-weight:400;letter-spacing:0.15em;color:#c7413f;">&#9679;</span>
    <span style="font-size:22px;font-weight:500;letter-spacing:0.15em;color:#262626;">DISPATCH</span>
  </div>
  <h1 style="font-size:18px;font-weight:600;margin:0 0 4px;color:#262626;">Texas Sentiment Monitor — Weekly Report</h1>
  <p style="font-size:13px;color:#6b7280;margin:0;">${weekLabel}</p>
</div>

<!-- Overall Score Card -->
<div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
  <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin:0 0 8px;">Overall Texas Sentiment</p>
  <p style="font-size:52px;font-weight:700;margin:0;color:${overallColor};line-height:1;">${fmtScore(stats.avgOverall)}</p>
  <p style="font-size:12px;color:#9ca3af;margin:8px 0 0;">Scale: −10 (crisis) to +10 (strong optimism) &nbsp;|&nbsp; Week trend: ${fmtTrend(stats.weekDelta)}</p>
  <p style="font-size:12px;color:#9ca3af;margin:4px 0 0;">${stats.totalVolume.toLocaleString()} posts analyzed across ${stats.snapshotCount} snapshots</p>
</div>

<!-- Narrative -->
<div style="margin-bottom:28px;">
  ${narrativeHtml}
</div>

<!-- Category Table -->
<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;font-weight:600;margin:0 0 10px;">Reporting Categories</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
  <tr>
    <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Category</th>
    <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Avg Score</th>
    <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Week Trend</th>
  </tr>
  ${catRows}
</table>

<!-- Issue Areas Table -->
<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;font-weight:600;margin:0 0 10px;">All 14 Issue Areas</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
  <tr>
    <th style="padding:6px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Issue</th>
    <th style="padding:6px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Avg</th>
    <th style="padding:6px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Trend</th>
    <th style="padding:6px 12px;text-align:right;border-bottom:2px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Volume</th>
  </tr>
  ${topicRows}
</table>

<!-- Footer -->
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;">
<p style="font-size:11px;color:#9ca3af;margin:0;">
  Texas Dispatch &mdash; Texas Political Sentiment Index<br>
  Data from Reddit, Bluesky, Mastodon, YouTube, Texas news RSS, local TV (KHOU, KVUE, WFAA, KENS5, KXAN), Google Trends.<br>
  Scores are keyword-matched sentiment. Normal political baseline: −1 to +1.<br>
  <a href="https://sentiment.localinsights.ai" style="color:#c7413f;text-decoration:none;">sentiment.localinsights.ai</a>
</p>

</body>
</html>`;
}

// ── Send email ────────────────────────────────────────────────────────────────
async function sendReport(html, stats) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const weekLabel = `${fmtDate(stats.dateRange.from)} – ${fmtDate(stats.dateRange.to)}`;
  const subject = `TX Sentiment Monitor — Week of ${weekLabel} (${fmtScore(stats.avgOverall)} overall)`;

  console.log(`Sending report to ${TO.join(', ')}...`);
  const result = await resend.emails.send({
    from: FROM,
    to: TO,
    subject,
    html,
  });

  if (result.error) throw new Error(`Resend error: ${result.error.message}`);
  console.log(`Report sent: ${result.data?.id || 'ok'}`);
  return result.data;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== TX Sentiment Weekly Report ===');

  // Validate required env
  const missing = ['ANTHROPIC_API_KEY', 'RESEND_API_KEY'].filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const snapshots = await fetchHistory();
  console.log(`Fetched ${snapshots.length} snapshots`);

  const stats = computeWeeklyStats(snapshots);
  console.log(`Week avg: ${fmtScore(stats.avgOverall)}, ${stats.totalVolume.toLocaleString()} total posts`);

  const narrative = await generateReport(stats);
  console.log('Narrative generated');

  const html = buildEmailHtml(narrative, stats);
  await sendReport(html, stats);

  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
