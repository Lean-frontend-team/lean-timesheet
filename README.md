# Lean Attendance

A bookmarklet that shows worked hours, the daily average and the balance from
[erp.lean.sa](https://erp.lean.sa/my/outsource/attendance). It runs only in the user's
browser and reads only their own ERP pages.

The build output is a single self-contained install page, `dist/index.html`. Share it as
one file, the same way the old `Lean Attendance - Install.html` was shared.

## Getting started

```sh
npm install
npm run dev       # install page at http://localhost:5173 (reloads when the bookmarklet code changes)
npm test          # calculation tests (Vitest)
npm run build     # → dist/index.html
```

Requires Node 20.19+.

## Project layout

```
index.html                 install page markup
src/install/               install page script and styles
src/bookmarklet/           the code that runs on erp.lean.sa
  index.js                 entry: host check, cache, load flow
  config.js                rules and constants (8h day, weekend, etc.)
  calculate.js             working days, required hours, balance, average
  today.js                 "you can leave at…" line and balance advice
  leaves.js                Leave page parsing → approved leave days
  erp.js                   reading the attendance and leave pages
  cache.js                 last results saved in localStorage
  format.js                time/date helpers
  ui/panel.js, styles.js   the overlay (shadow DOM)
tests/                     unit tests for the pure logic
vite.config.js             bundles src/bookmarklet into a minified IIFE and injects it as
                           `virtual:bookmarklet` into the install page
```

## Workflow and deployment

Everything is automated with GitHub Actions:

1. Create a branch, push it, and open a pull request into `main`.
2. **CI** ([ci.yaml](.github/workflows/ci.yaml)) checks formatting, runs the tests and
   builds. `main` is protected, so the PR can only be merged once CI passes.
3. When the PR is merged, **Deploy** ([deploy.yaml](.github/workflows/deploy.yaml))
   tests, builds, and publishes `dist/` to GitHub Pages.

To redeploy without a change, run **Deploy** from the repo's Actions tab
(_Run workflow_).

## How it calculates

- **Working day**: a Sunday–Thursday row in the attendance table. 8 hours required.
- **WFH** counts as a full 8-hour day.
- **Not required**: Friday and Saturday, approved leaves (from the Leave page), and
  Leave / Public Holiday days. Hours worked on those days count as extra.
- **Absence / No Show** and days with 00:00 still require 8 hours.
- **Today** is left out unless it's ticked in the Days list.
- **Balance** = total worked − required. **Average** = total worked ÷ working days.

## Testing on a local page

The bookmarklet runs on `erp.lean.sa` and on `localhost`. To try UI changes without
the ERP, serve a page at `localhost` that has a `#summaryTable` with the same columns
as the ERP (date, weekday, check in, check out, worked, status, state). Then run the
code from **Copy code** in the browser console.
