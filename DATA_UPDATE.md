# ASDMA data update runbook

**Goal:** Update FloodAssist every day from the official ASDMA / SDRF Daily Flood Report, and keep **past + present** figures accurate and verified. Never invent numbers. Never publish the wrong day’s PDF as today.

Source: [sdrf.assam.gov.in/dfr](https://sdrf.assam.gov.in/dfr/)  
Live site deploys from `main` via Vercel after a merged PR.

---

## Rules (non-negotiable)

1. **Official source only** — flood figures come from the ASDMA Daily Flood Report PDF. No mock data, no guessed camps, no invented weather.
2. **Same-day, not realtime** — say “latest official daily report,” not live gauges.
3. **Date must match** — the PDF’s “Assam Flood Report as on DD-MM-YYYY” must equal the day you claim. If the portal returns an older PDF for a newer date, **do not publish**.
4. **Verify before merge** — people, villages, relief camps, and inmates must match the PDF statewide totals.
5. **PR to `main`** — never push data straight to `main` if branch protection applies. Review the diff.
6. **Past history stays honest** — if the scraper is fixed, re-parse cached PDFs and rebuild `history.json` so Past Reports stay correct.

---

## Daily update (new report day)

Do this once the day’s PDF is on the ASDMA portal (often evening IST; sometimes delayed).

```bash
# From repo root, on a clean branch from latest main
git fetch origin main
git checkout -B data/asdma-refresh-YYYY-MM-DD origin/main

python3 -m pip install -r scripts/requirements.txt
python3 scripts/scrape_asdma_pdf.py --date YYYY-MM-DD
```

Example for 3 Aug 2026:

```bash
python3 scripts/scrape_asdma_pdf.py --date 2026-08-03
```

### Accuracy check (required)

Before committing, confirm:

| Check | Pass when |
| --- | --- |
| `src/data/meta.json` → `reportDate` | Equals `YYYY-MM-DD` |
| `src/data/stats.json` → `peopleAffected` | Equals PDF **Total** population |
| Sum of district `affectedVillages` | Equals PDF villages **Total** |
| `stats.reliefCamps` | Equals PDF relief-camp column **Total** |
| `stats.campInmates` | Equals PDF inmates **Total** |
| `stats.floodedDistricts` | Equals PDF “No. of Districts Affected” |
| Rivers on Home / Weather | Match “above danger level” list in PDF |
| `history.json` first entry | Same date as live report |

If the scraper prints `wrong report date inside PDF` or lookback lands on an older day, **stop** — that date is not published yet. Keep live data on the last verified day.

### Commit & ship

```bash
git add src/data public/sitemap.xml
git commit -m "chore: refresh ASDMA flood data (YYYY-MM-DD)"
git push -u origin HEAD
# Open PR → review figures → merge → Vercel redeploys
```

The scraper also bumps `public/sitemap.xml` `<lastmod>` to the report date — include that file in the data PR.

PR title example: `Data: refresh ASDMA flood report (2026-08-03)`

---

## Keep past data accurate

Cached PDFs live in `scripts/raw/asdma_flood_YYYY-MM-DD.pdf` (gitignored). After scraper fixes, **re-verify** history:

1. Re-parse every local PDF with the current `scripts/scrape_asdma_pdf.py`.
2. Compare each day to PDF totals (people, villages, camps, inmates).
3. Rebuild `src/data/history.json` from those parses.
4. Set live dashboard files from the **latest** verified day only.
5. Open a PR; in the body list any days that changed and why (e.g. “31 Jul people 115343 → 192799 after name-wrap fix”).

Do **not** leave known undercounts in Past Reports / trend charts.

---

## What is verified vs app-derived

| UI content | Status |
| --- | --- |
| People, villages, camps, inmates, rivers from ASDMA | **Verified** against that day’s PDF |
| Past Reports snapshots | **Verified** when history was rebuilt from PDFs |
| District badge (Affected / Not listed) | **ASDMA-backed** — from the PDF affected list / verified counts. ASDMA does **not** publish Severe/Moderate codes |
| Map heat bands (people ranges) | **From ASDMA people/camp totals** — visual only; not an official severity label |
| Daily Brief / Situation Guidance / rankings | **Rule-based** from the verified numbers — not an LLM |
| Emergency contacts, checklist, safety tips | **Published official guidance** with `sourceUrl` + `lastVerified` — not a realtime feed |
| Donate links | **Outbound only** — we do not verify how funds are spent |
| Map pin coordinates | **District HQ approx.** — ASDMA daily PDF has **no** camp street GPS |

Never claim **realtime** gauges, live camp GPS, or official ASDMA severity codes.

---

## Automation note

GitHub Actions **daily cron is disabled** (ASDMA often unreachable from GitHub runners). Refresh **manually** (or via local Mac scheduler) and push a data PR.

Optional: Actions → “Update ASDMA flood data” → Run workflow (`workflow_dispatch`) — only if the portal works from Actions; still review the PR.

---

## Quick commands

```bash
npm run scrape:pdf                          # newest available day
python3 scripts/scrape_asdma_pdf.py --date YYYY-MM-DD
./scripts/install_local_scheduler.sh run-now   # Mac local scrape + PR helper
```

---

## Reminder for public / portfolio copy

- Accurate: “same-day official ASDMA figures”
- Avoid: “realtime,” “ASDMA verified us,” “we verify donations”
