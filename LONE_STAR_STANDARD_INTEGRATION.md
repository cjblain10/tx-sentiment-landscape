# Lone Star Standard × LocalInsights.ai
## Widget Integration Guide

The TX Sentiment widget has been styled to match Lone Star Standard's brand identity.

---

## Quick Start: Add to Your Site

### Option 1: Iframe Embed (Recommended)

**Copy and paste this code into any page:**

```html
<iframe
  src="https://sentiment.localinsights.ai/embed.html"
  width="100%"
  height="500"
  frameborder="0"
  style="border: none; max-width: 650px; margin: 0 auto; display: block;"
></iframe>
```

**That's it!** The widget will automatically:
- Load current sentiment data
- Update daily
- Match Lone Star Standard branding
- Work on mobile and desktop

---

### Option 2: JavaScript Widget (More Flexible)

**Add these two lines to your page:**

```html
<div id="tx-sentiment-widget"></div>

<script src="https://sentiment.localinsights.ai/widget.js"></script>
<script>
  TXSentiment.init({
    container: '#tx-sentiment-widget',
    theme: 'light',
    compact: false
  });
</script>
```

**Customization options:**
- `theme: 'light'` — Always use light theme for Lone Star Standard
- `compact: true` — Makes widget smaller (optional)

---

## What It Shows

**Overall Sentiment Score**
- Single score showing how Texans feel overall (-1.0 to +1.0)
- Daily change indicator (▲ up / ▼ down)

**4 Key Issue Categories**
1. **Cost of Living** — Housing, property taxes
2. **Economy** — Jobs, tech, transportation
3. **Health Care** — Healthcare policy
4. **Education** — Education issues

Each shows:
- Current sentiment score
- Color coding (green = positive, red = negative)

**Branding**
- Header: "Lone Star Standard × LocalInsights.ai"
- Footer: "A Lone Star Standard project powered by LocalInsights.ai"
- Links back to lonestarstandard.com

---

## Visual Style

**Matches Lone Star Standard:**
- ✅ Clean, professional news aesthetic
- ✅ Blue accents (#2c5282)
- ✅ Traditional serif typography (Georgia)
- ✅ Light background with subtle borders
- ✅ Mobile-responsive

**Example:**
```
┌─────────────────────────────────────────────┐
│  Lone Star Standard × LocalInsights.ai      │
│                                             │
│      How Texans Feel Right Now             │
│                                             │
│              +0.5 ▲0.2                     │
│                                             │
├─────────────────────────────────────────────┤
│  COST OF LIVING    ECONOMY                 │
│      -0.3           +0.7                   │
│                                             │
│  HEALTH CARE      EDUCATION                │
│      -0.1           +0.2                   │
└─────────────────────────────────────────────┘
```

---

## Data Source

**Currently:** Demo data (Twitter feed broken, Reddit integration pending)
**Coming Soon:** Live Reddit data (~6,000-10,000 posts/day)
**Updates:** Daily at midnight CT

When live data is available, the widget will automatically switch over — no code changes needed.

---

## Placement Suggestions

**Homepage sidebar** — Show Texas sentiment alongside news
**Politics section** — Add context to political coverage
**Opinion pages** — Ground commentary in real-time sentiment
**Dedicated data page** — Full-page sentiment dashboard

---

## Technical Details

- **Hosted:** Netlify CDN (fast, reliable)
- **Mobile:** Fully responsive
- **Performance:** Lightweight (~75KB gzipped)
- **Browser support:** All modern browsers
- **No tracking:** Privacy-friendly, no cookies

---

## Live Preview

**Embed widget:** https://sentiment.localinsights.ai/embed.html
**Full dashboard:** https://sentiment.localinsights.ai

---

## Questions?

Contact: charles@localinsights.ai

**Ready to launch:** Widget is live and ready to embed on lonestarstandard.com today.
