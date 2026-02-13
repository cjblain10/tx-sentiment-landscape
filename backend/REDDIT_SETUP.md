# Reddit API Setup Guide

## ✅ **NO SETUP NEEDED!**

The backend now uses Reddit's public JSON API via `old.reddit.com` which **doesn't require any authentication or credentials**.

---

## How It Works

The backend automatically:
- Fetches posts from 8 subreddits (r/texas, r/houston, r/austin, r/dallas, r/sanantonio, r/politics, r/conservative, r/liberal)
- Filters for posts from the last 24 hours
- Matches against monitored keywords (border security, healthcare, education, etc.)
- Analyzes sentiment
- Groups by categories (Cost of Living, Economy, Health Care, Education)

**No authentication required. Just works.**

---

## Rate Limits

The public API allows:
- ~60 requests per minute per IP
- We make 8 requests (one per subreddit) with 1-second delays
- Total collection time: ~8 seconds per API call

---

## Testing Locally

```bash
cd /Users/cb/Projects/tx-sentiment-landscape/backend
npm install
npm start
```

Then test:
```bash
curl http://localhost:3000/api/sentiment/today
```

You should see real Reddit data with `"source": "reddit"`

---

## Production Deployment

Already deployed! The backend is live at:
- **https://tx-sentinel-api.onrender.com**

Render auto-deploys when you push to GitHub:
```bash
git add .
git commit -m "Update backend"
git push origin master
```

---

## What It Collects

**Expected volume:** 20-100 posts per day depending on activity

**Subreddits monitored:**
- r/texas, r/houston, r/austin, r/dallas, r/sanantonio
- r/politics, r/conservative, r/liberal

**Keywords tracked:**
- border security, energy & grid, ERCOT, education, healthcare
- housing, property tax, crime & safety, elections, gun policy
- water & drought, abortion, employment, unemployment

---

## Troubleshooting

**"source": "demo" in API response**
- The collector found 0 matching posts in the last 24 hours
- Try again during peak hours (9am-9pm CT)
- Check that subreddits haven't changed their posting patterns

**HTTP 403 errors**
- Reddit is rate limiting
- The backend automatically adds 1-second delays between requests
- Should resolve itself after a few minutes

---

## Optional: Add Authentication for Higher Rate Limits

If you want **higher rate limits** and **authenticated access**, you can add credentials:

1. Create a Reddit app at https://www.reddit.com/prefs/apps
2. Choose "script" type
3. Add to `.env`:
   ```bash
   REDDIT_CLIENT_ID=your_client_id
   REDDIT_CLIENT_SECRET=your_client_secret
   REDDIT_USERNAME=maxx1089
   REDDIT_PASSWORD=your_password
   ```

But **this is optional** - the current setup works great without it!
