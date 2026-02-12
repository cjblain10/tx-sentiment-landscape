# TX Sentiment Dashboard - Design Evaluation & Recommendations

## Current State Analysis

### What's Working ✅
- Clean light theme appropriate for news publication
- Lone Star Standard co-branding established
- Clear information hierarchy
- Functional data visualization
- Mobile responsive structure

### What Needs Improvement ❌

#### 1. **Visual Identity Mismatch**
- **Issue:** Dashboard feels like a tech product, not a news editorial tool
- **Problem:** Rounded corners, tech-style cards, and data-centric layout don't match LSS's journalistic aesthetic
- **Impact:** Feels disconnected from the Lone Star Standard brand

#### 2. **Weak Visual Hierarchy**
- **Issue:** Everything has similar visual weight
- **Problem:** No clear focal point; categories, movers, and topics compete for attention
- **Impact:** User doesn't know where to look first

#### 3. **Lack of Editorial Framing**
- **Issue:** Displays raw data without journalistic context
- **Problem:** Numbers alone don't tell stories; LSS is about narrative journalism
- **Impact:** Feels like a spreadsheet, not news content

#### 4. **Bland Typography**
- **Issue:** Generic sans-serif throughout
- **Problem:** LSS uses distinctive typography to establish authority
- **Impact:** Looks generic, could be any data dashboard

#### 5. **Missing Texas Identity**
- **Issue:** Could be about any state
- **Problem:** No visual cues that this is specifically about Texas
- **Impact:** Doesn't reinforce LSS's Texas-first brand

---

## Recommended Improvements

### Priority 1: Editorial Framing (HIGH IMPACT)

**Current:** "How Texans Feel Right Now" + raw numbers
**Recommended:** Lead with a narrative summary

```
┌─────────────────────────────────────────────────┐
│  MOOD OF THE STATE                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│  "Texans remain cautiously optimistic about    │
│  the economy (+0.7) while growing concerns     │
│  about cost of living (-0.3) dominate          │
│  conversations this week."                     │
│                                                 │
│  Overall Sentiment: +0.5 ▲0.2                  │
│  Based on 6,234 conversations · Feb 12, 2026  │
└─────────────────────────────────────────────────┘
```

**Impact:** Transforms data into story; feels like LSS editorial content

---

### Priority 2: Texas Visual Identity (MEDIUM IMPACT)

**Add subtle Texas visual cues:**

1. **Texas state outline** as subtle background element in header
2. **Regional map visualization** showing sentiment by region (not just chips)
3. **"Top Issues" section header** styled like LSS website's issue tags
4. **Color-coded regions** matching Texas geography (Gulf Coast blue, West Texas tan, etc.)

**Example Header:**
```
┌────────────────────────────────────────────────────┐
│  [TX outline icon] Lone Star Standard             │
│  THE TEXAS PULSE                                   │
│  Powered by LocalInsights.ai                       │
└────────────────────────────────────────────────────┘
```

---

### Priority 3: News-Style Layout (HIGH IMPACT)

**Current:** Centered cards in a grid
**Recommended:** Editorial column layout like LSS homepage

```
┌─────────────────────────────────────────────────────┐
│ LEAD STORY (Full width)                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ECONOMY: Texans Most Optimistic in 6 Months       │
│ Sentiment: +0.7 ▲0.3 · 1,234 mentions             │
│ "Jobs and tech growth drive positive outlook..."   │
├─────────────────────────────────────────────────────┤
│ [Left Column]            │ [Right Column]          │
│ COST OF LIVING           │ HEALTH CARE             │
│ Sentiment: -0.3          │ Sentiment: -0.1         │
│ ━━━━━━━━━━━━━━━━━━━━━━ │ ━━━━━━━━━━━━━━━━━━━━━ │
│ Housing prices...        │ Rural hospitals...      │
└─────────────────────────────────────────────────────┘
```

**Impact:** Feels like reading news, not analyzing data

---

### Priority 4: Distinctive Typography (MEDIUM IMPACT)

**Implement LSS-style type hierarchy:**

1. **Section headers:** Bold, uppercase, small font size (like "TOP ISSUES" on LSS site)
   - Current: `font-size: 0.7rem` lowercase
   - Recommended: `font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;`

2. **Category names:** Larger, serif headlines
   - Current: Small uppercase labels
   - Recommended: `font-size: 1.5rem; font-family: Georgia; font-weight: 700;`

3. **Scores:** Less prominent (data supports the story, doesn't lead)
   - Current: 3rem giant numbers
   - Recommended: `font-size: 1.8rem` with more context text

**Example:**
```
COST OF LIVING
━━━━━━━━━━━━━━━━━━━━━━━━
Housing prices and property taxes drive pessimism
Sentiment: -0.3 (down 0.05 from yesterday)
```

---

### Priority 5: Color Strategy (LOW IMPACT but EASY)

**Current colors are weak:**
- Pos green: #2f855a (muted, forest green)
- Neg red: #c53030 (generic red)
- Accent blue: #2c5282 (navy)

**Recommended: Texas-inspired palette**
- **Positive:** `#38A169` (Brighter green, Hill Country)
- **Negative:** `#C05621` (Burnt orange/red, more distinctive than pure red)
- **Accent:** `#2C5282` (Keep navy blue for LSS continuity)
- **Texas Gold:** `#D69E2E` (Highlight color for "top mover" or featured items)

**Add semantic color usage:**
- Economy = Green (growth)
- Cost of Living = Orange (warning)
- Healthcare = Blue (institutional)
- Education = Purple (civic)

---

### Priority 6: Data Visualization Improvements (HIGH IMPACT)

**1. Replace "Biggest Movers" list with visual timeline:**
```
SENTIMENT SHIFTS (Past 7 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Economy       ▂▃▅▆██▇█  +0.7 ▲
Healthcare    ██▇▅▃▂▂▁  -0.1 ▼
Cost of Living▇▇██▇▆▅▄  -0.3 ▼
```

**2. Add regional breakdown map:**
- Small Texas map showing sentiment by region (color-coded)
- Click region to filter data
- More visual than current chip buttons

**3. Sparkline trends for each category:**
- 7-day mini chart next to each category score
- Shows trajectory, not just current snapshot

---

### Priority 7: Content Enhancements (MEDIUM IMPACT)

**Add editorial context layers:**

1. **"Why This Matters" tooltips** on each category
   - Economy: "Job growth impacts statewide elections"
   - Healthcare: "Rural hospital closures affect 1.2M Texans"

2. **Sample quotes/mentions** in expandable sections
   - "What Texans are saying about Cost of Living..."
   - Real quotes from social media (if using real data)

3. **Historical comparison**
   - "Economy sentiment highest since August 2025"
   - Gives context to current numbers

4. **Related LSS coverage links**
   - "Read LSS coverage: 'Healthcare Crisis in Rural Texas'"
   - Drives traffic to main site

---

## Quick Wins (Implement Today)

### 1. Update Section Headers
Change all section titles to uppercase LSS style:
```css
.categories-title, .movers-title {
  font-family: var(--sans);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text);
  border-bottom: 3px solid var(--accent);
  padding-bottom: 0.5rem;
  margin-bottom: 1.5rem;
}
```

### 2. Add Texas Icon to Header
```jsx
<h1 className="logo">
  <span className="texas-icon">★</span>
  Lone Star Standard <span>× LocalInsights.ai</span>
</h1>
```

### 3. Reduce Number Size, Add Context
Change from giant scores to contextual statements:
```jsx
<div className="category-summary">
  <h4>Cost of Living</h4>
  <p className="sentiment-statement">
    Texans express growing concern (-0.3)
  </p>
  <span className="delta">Down 0.05 from yesterday</span>
</div>
```

### 4. Add Lead Story Summary
At top of page, above categories:
```jsx
<section className="lead-summary">
  <h3>TODAY'S MOOD</h3>
  <p className="summary-text">
    {generateSummary(data)} {/* Auto-generated from data */}
  </p>
</section>
```

### 5. Style "Demo Data" Banner Like LSS Alert
Make it look like editorial notice, not error message:
```css
.status-banner.demo {
  background: #FEF3C7;
  border: 2px solid #D69E2E;
  border-left-width: 6px;
  color: #744210;
  font-weight: 600;
  text-align: left;
  padding: 1rem 1.5rem;
}

.status-banner.demo::before {
  content: "NOTE: ";
  font-weight: 700;
}
```

---

## Long-Term Enhancements

1. **Daily Editorial Summary** (written by LSS staff based on data)
2. **Integration with LSS articles** (link sentiment spikes to published stories)
3. **Historical archive** ("View sentiment from inauguration week")
4. **Email alerts** ("Get weekly sentiment summary")
5. **Comparative view** ("How does today compare to last election cycle?")

---

## Brand Alignment Checklist

- [ ] Uses LSS typography hierarchy (uppercase section headers)
- [ ] Includes Texas visual identity (icon, map, or outline)
- [ ] Editorial framing (narrative, not raw numbers)
- [ ] News-style layout (columns, not centered cards)
- [ ] LSS color palette (matches homepage accent colors)
- [ ] Links to LSS content (drives main site traffic)
- [ ] Professional tone (serious journalism, not tech demo)

---

## Next Steps

**Recommend implementing in this order:**

1. **Quick Wins** (1-2 hours) — Immediate visual impact
2. **Editorial Framing** (2-3 hours) — Transforms data into story
3. **Layout Restructure** (3-4 hours) — News-style columns
4. **Texas Visual Identity** (2-3 hours) — Brand reinforcement
5. **Data Viz Improvements** (4-6 hours) — Sparklines, maps, trends

**Total estimated time:** 12-18 hours for complete transformation

---

## Mockup Comparison

**Before:** Tech dashboard with centered cards and giant numbers
**After:** News editorial tool with story-driven layout and contextual data

The goal is for a reader to land on this page and think:
> "This is a Lone Star Standard editorial tool"

NOT:
> "This is a data analytics dashboard"

---

Ready to implement any/all of these changes. Which priority should we tackle first?
