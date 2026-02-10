# Tomorrow's Implementation Checklist

## 🎯 Goal
Wire up real data sources (Composio, Claude, Supabase) and deploy. See how the professional design looks with actual Texas political sentiment data.

---

## ✅ Phase 1: Deploy Backend (5 min)

**Option A: Render.com (Recommended)**
- [ ] Go to https://render.com
- [ ] Sign in with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Select repo: `cjblain10/tx-sentiment-landscape`
- [ ] Configure:
  - **Name:** `tx-sentiment-api`
  - **Build command:** `cd backend && npm install`
  - **Start command:** `npm start -w backend`
  - **Plan:** Free tier
- [ ] Deploy
- [ ] Copy public URL (e.g., `https://tx-sentiment-api.onrender.com`)

**Option B: Railway.app**
- [ ] Go to https://railway.app
- [ ] Connect GitHub repo
- [ ] Deploy (uses Procfile)

---

## ✅ Phase 2: Wire Real Data (Backend)

**Update `/Users/cb/Projects/tx-sentiment-landscape/backend/src/index.js`:**

Replace mock data with:
- [ ] Import `Composio` SDK
- [ ] Add environment variables:
  - `COMPOSIO_API_KEY` (you have this)
  - `CLAUDE_API_KEY` (add if needed)
  - `SUPABASE_URL` + `SUPABASE_KEY` (optional, for persistence)
- [ ] Update `/api/sentiment/today` to:
  1. Fetch real Twitter/Reddit data via Composio
  2. Score sentiment via Claude API (-1 to +1)
  3. Return actual data instead of `getDailySentimentData()`

**File location:** `backend/src/index.js` (lines ~15-30)

**Pseudocode:**
```javascript
app.get('/api/sentiment/today', async (req, res) => {
  // 1. Fetch from Composio (Twitter, Reddit, news)
  // 2. Process with Claude sentiment scoring
  // 3. Return real data
});
```

---

## ✅ Phase 3: Deploy Backend

- [ ] Commit changes to GitHub:
  ```bash
  git add -A
  git commit -m "Wire real data: Composio + Claude + Supabase"
  git push origin master
  ```

- [ ] Render auto-deploys (watch logs)
- [ ] Test API: `curl https://tx-sentiment-api.onrender.com/api/sentiment/today`

---

## ✅ Phase 4: Update Frontend

**Add backend URL to Netlify:**
- [ ] Go to Netlify dashboard: https://app.netlify.com/sites/jade-cucurucho-b5d290
- [ ] Settings → Build & Deploy → Environment
- [ ] Add: `VITE_API_URL=https://tx-sentiment-api.onrender.com`
- [ ] Trigger redeploy

**Or update vite.config.js:**
```javascript
define: {
  __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'https://tx-sentiment-api.onrender.com'),
}
```

---

## ✅ Phase 5: Verify Live

- [ ] Visit https://jade-cucurucho-b5d290.netlify.app
- [ ] Check footer: Should show ✅ **Live API** (not 📊 Mock Data)
- [ ] See real sentiment data for 8 Texas figures
- [ ] Click figures to see real issue breakdowns
- [ ] Verify colors/fonts look professional

---

## 🔑 API Keys Needed

- ✅ `COMPOSIO_API_KEY` — You have: `ak_cdwQZVwTOel5YxPz9BgL`
- ⏳ `CLAUDE_API_KEY` — Need to add to backend `.env`
- ⏳ `SUPABASE_URL` + `SUPABASE_KEY` — Optional (for data persistence)

---

## 📁 Files to Update Tomorrow

| File | Change | Priority |
|------|--------|----------|
| `backend/src/index.js` | Add real data fetching | 🔴 HIGH |
| `backend/.env` | Add API keys | 🔴 HIGH |
| Frontend env vars | Add backend URL | 🟡 MEDIUM |
| `backend/src/mockData.js` | Archive (no longer used) | 🟢 LOW |

---

## ⚠️ Potential Blockers

- **Composio API limits** — Free tier has 5K calls/month (one batch per day = OK)
- **Claude API costs** — ~$0.50-1.00/month at current volume
- **CORS issues** — Frontend → Backend CORS headers may need adjustment
- **Data availability** — Twitter/Reddit may not have recent posts for all figures

**Mitigation:** Test with 1-2 figures first, then expand to 8.

---

## 🎉 Success Criteria

✅ Frontend shows `✅ Live API` in footer
✅ Sentiment data for 8 figures loads
✅ Data is recent (today's or yesterday's)
✅ Colors/fonts look professional (not toy-like)
✅ Click a figure → see breakdown by issue

---

## 📞 Quick Refs

- **Composio docs:** https://docs.composio.dev
- **Claude API:** https://claude.ai/api
- **Render deploy:** https://render.com/docs
- **Project repo:** https://github.com/cjblain10/tx-sentiment-landscape

---

**Status:** Ready to execute tomorrow. All infrastructure in place.
