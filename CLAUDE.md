# TX Sentiment Monitor — Agent Rules

## Brand: The Texas Dispatch
- Background: `#262626` (charcoal). NOT navy `#0a0e27`.
- Accent: `#c7413f` (red).
- Header: "TEXAS DISPATCH". Footer: thetexasdispatch.com.
- Public access — NO password gate.

## Scoring: 0-100 (50 = neutral)
- API returns 0-100. Display as whole numbers.
- DO NOT convert to -1..1. DO NOT use +/- format.
- `fmt(s)` = `Math.round(s).toString()`
- Positive >= 50 (green), Negative < 50 (red).

## Deploy
- Build: `cd frontend && npm run build`
- Deploy: `netlify deploy --prod --dir=frontend/dist --no-build`
- Site ID: `5fc84220-613a-48c9-a142-570c81b49a1c`
- URL: https://sentiment.localinsights.ai

## API Keys
- Embed key (frontend): `txs_embed_089e6a982d263fcc4d90c525fd0a1c33`
- Data key: `txs_data_94313aab...` (see .env)
- Backend: https://tx-sentinel-api.onrender.com

## History of Incidents
- 2026-04-28: Cursor added `toInternalScore()` that converted 0-100 back to -1..1, broke all displays. Reverted by Icarus (Code). Brand protection rules added.
