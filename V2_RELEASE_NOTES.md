# TX Sentiment Tracker V2 — Release Notes

**Deployed:** February 12, 2026
**Live URL:** https://sentiment.localinsights.ai
**Client:** Michael Searle / Searle Strategies

---

## What's New

### 1. Updated Title ✅
**"How Texans Feel Right Now"** (was "How Texas Feels Right Now")

### 2. Overall Sentiment Score ✅
- **Global sentiment score** displayed prominently at top of page
- Volume-weighted aggregate across all tracked issues
- **Daily change indicator:** Shows movement from previous day
  - Example: `+0.5 ▲0.2` (score is +0.5, up 0.2 from yesterday)
  - Green for positive, red for negative
- Updates daily

### 3. Predetermined Issue Categories ✅
**Four primary categories, each with their own score + trend:**

1. **Cost of Living** — Housing, Property Tax
2. **Economy** — Economy & Jobs, Tech & Innovation, Transportation
3. **Health Care** — Healthcare issues
4. **Education** — Education policy

Each category card shows:
- Sentiment score (-1.0 to +1.0 scale)
- Daily change indicator
- Mention volume

**Note:** Categories are configurable — you can change these anytime by updating the code.

### 4. Biggest Movers Today ✅
New section showing **top 5 issues with largest sentiment swings**:
- Displays current sentiment
- Shows daily change (▲/▼)
- Sorted by absolute change magnitude
- Highlights what's "popping" in real-time

### 5. External Website Integration ✅

**Four integration methods for Searle Strategies website:**

#### **Option A: Iframe Embed** (Easiest)
```html
<iframe
  src="https://sentiment.localinsights.ai/embed.html"
  width="100%"
  height="400"
  frameborder="0"
  style="border: none; border-radius: 12px;"
></iframe>
```

#### **Option B: JavaScript Widget** (Flexible)
```html
<div id="tx-sentiment-widget"></div>

<script src="https://sentiment.localinsights.ai/widget.js"></script>
<script>
  TXSentiment.init({
    container: '#tx-sentiment-widget',
    theme: 'dark', // or 'light'
    compact: false,
  });
</script>
```

#### **Option C: API Endpoint** (Full Control)
**Endpoint:** `GET https://tx-sentinel-api.onrender.com/api/sentiment/today`

Returns JSON with:
- Overall score + delta
- All 4 categories with scores
- Biggest movers
- Full topic breakdown

#### **Option D: React Component** (For React Sites)
Pre-built React component available for import.

**Full integration guide:** `INTEGRATION.md` in project repo

---

### 6. Data Sources Research ✅

**Current Status:** Twitter/X feed broken (Composio OAuth revoked)

**Recommended Next Steps:**

1. **Reddit API** (Free) — r/texas, r/TexasPolitics, regional subs
   - ~6,000-10,000 posts/day
   - High-quality discussions
   - Easy to integrate

2. **Bluesky API** (Free) — Growing post-X platform
   - ~1,000-3,000 posts/day
   - Open protocol
   - No rate limits

3. **Sentiment Analysis:** Hugging Face Transformers (free, local)
   - Model: `cardiffnlp/twitter-roberta-base-sentiment-latest`
   - Accurate for social media
   - No cost

**Full research:** `DATA_SOURCES.md` in project repo

**ETA for live Reddit data:** 5-7 days if prioritized

---

## Technical Details

**Frontend:** React + Vite, deployed on Netlify
**Backend:** Node.js + Express, deployed on Render (auto-deploy via GitHub)
**Data:** Currently cached/demo (Twitter feed broken, Reddit integration pending)

**Key Files:**
- `INTEGRATION.md` — Full integration guide for external websites
- `DATA_SOURCES.md` — Free data source alternatives research
- `embed.html` — Standalone iframe widget
- `widget.js` — Drop-in JavaScript widget

---

## Next Steps

1. **Review integration options** — Choose iframe, widget, or API for Searle Strategies site
2. **Wire up Reddit API** — Replace broken Twitter feed (5-7 days)
3. **Category customization** — Confirm 4 primary categories or adjust as needed
4. **Test embed** — Verify widget works on your site

---

## Demo Links

- **Main Dashboard:** https://sentiment.localinsights.ai
- **Embed Widget:** https://sentiment.localinsights.ai/embed.html
- **API Endpoint:** https://tx-sentinel-api.onrender.com/api/sentiment/today

---

## Questions?

Contact: charles@localinsights.ai

All code deployed and live as of February 12, 2026.
