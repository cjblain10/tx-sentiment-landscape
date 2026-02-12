# TX Sentiment Tracker - Integration Guide
## Lone Star Standard × LocalInsights.ai

This document provides multiple options for integrating the TX Sentiment Tracker into the Lone Star Standard website.

## Option 1: Iframe Embed (Simplest)

Embed the widget as an iframe on any page:

```html
<iframe
  src="https://sentiment.localinsights.ai/embed.html"
  width="100%"
  height="400"
  frameborder="0"
  style="border: none; border-radius: 12px;"
></iframe>
```

**Pros:**
- Zero code required
- Automatically updates with new data
- Works on any website platform

**Cons:**
- Fixed dimensions (adjustable via width/height attributes)
- Limited styling customization

---

## Option 2: JavaScript Widget (Drop-in)

Add this script tag to your website to inject the widget:

```html
<div id="tx-sentiment-widget"></div>

<script src="https://sentiment.localinsights.ai/widget.js"></script>
<script>
  TXSentiment.init({
    container: '#tx-sentiment-widget',
    theme: 'dark', // or 'light'
    compact: false, // set to true for smaller version
  });
</script>
```

**Pros:**
- More flexible sizing
- Configurable styling options
- Inherits parent page fonts (optional)

**Cons:**
- Requires JavaScript enabled
- Slightly more complex integration

---

## Option 3: API Endpoint (Custom Integration)

Fetch raw data and build your own UI:

### Endpoint: `GET /api/sentiment/today`

**Base URL:** `https://tx-sentinel-api.onrender.com`

**Response:**
```json
{
  "date": "2026-02-12",
  "source": "twitter",
  "overallScore": 0.12,
  "scoreDelta": 0.05,
  "totalVolume": 1234,
  "categories": [
    {
      "name": "Cost of Living",
      "sentiment": -0.15,
      "delta": -0.03,
      "volume": 345,
      "topics": ["housing", "property tax"]
    },
    {
      "name": "Economy",
      "sentiment": 0.22,
      "delta": 0.08,
      "volume": 512,
      "topics": ["economy & jobs"]
    },
    {
      "name": "Health Care",
      "sentiment": -0.08,
      "delta": -0.02,
      "volume": 198,
      "topics": ["healthcare"]
    },
    {
      "name": "Education",
      "sentiment": 0.05,
      "delta": 0.01,
      "volume": 179,
      "topics": ["education"]
    }
  ],
  "biggestMovers": [
    {
      "name": "border security",
      "sentiment": -0.45,
      "delta": -0.18,
      "volume": 421
    }
  ],
  "topics": [...],
  "regions": {...}
}
```

**Example JavaScript:**
```javascript
fetch('https://tx-sentinel-api.onrender.com/api/sentiment/today')
  .then(response => response.json())
  .then(data => {
    document.getElementById('overall-score').textContent = data.overallScore.toFixed(1);
    // Render categories, movers, etc.
  });
```

**Pros:**
- Complete control over UI/UX
- Can integrate into existing design system
- Fetch only the data you need

**Cons:**
- Requires custom frontend development
- Must handle data formatting/display

---

## Option 4: React Component (For React Sites)

If your site uses React, you can import the component directly:

```jsx
import TXSentimentWidget from 'https://sentiment.localinsights.ai/widget.react.js';

function App() {
  return (
    <div>
      <TXSentimentWidget
        compact={false}
        showCategories={true}
        showMovers={false}
      />
    </div>
  );
}
```

**Pros:**
- Native React integration
- Type-safe props
- Full customization via props

**Cons:**
- Only works for React-based websites
- Requires build step

---

## Recommended Approach for Lone Star Standard

**Best option:** Use Option 1 (iframe embed) or Option 2 (JavaScript widget)

Both options have been styled to match Lone Star Standard's brand:
- Clean, professional news aesthetic
- Blue accent colors (#2c5282)
- Traditional serif typography (Georgia)
- Light background with subtle borders
- "Lone Star Standard × LocalInsights.ai" branding

**If custom design needed:** Use Option 3 (API endpoint) to fetch data and build a fully custom UI

---

## Data Freshness

- Data updates daily (currently cached from most recent successful pull)
- Real-time Twitter feed integration coming soon (Reddit API planned as interim)
- Stale data is clearly marked with yellow banner on main site

---

## CORS & Security

All API endpoints support CORS for client-side requests. No API key required for read-only access.

---

## Support

Questions? Contact charles@localinsights.ai or reference the full dashboard at https://sentiment.localinsights.ai
