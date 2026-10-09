# Roadmap Studio

Turn a product roadmap CSV into an exec-ready **Now / Next / Later** board, then export a one-pager PNG or landscape PDF. Files stay in the browser — nothing is uploaded.

## What it does

1. **Upload** a `.csv` (or load the sample) and map columns
2. **Rank** a numeric `priority` column into Now / Next / Later
3. **Present** product swimlanes with status-colored cards
4. **Export** `roadmap-YYYY-qN.png` or a landscape PDF

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/), then **Load sample** or drop your own CSV.

## CSV columns

| Field | Required | Notes |
| --- | --- | --- |
| title | yes | Initiative name |
| priority | yes | Rank (1 is highest) or already `now` / `next` / `later` |
| month | yes | e.g. `2026-04` |
| product | yes | Swimlane |
| status | yes | Colors the card (`On track`, `At risk`, …) |
| owner | no | Shown on the card |

See `public/sample-roadmap.csv` for a working example.
