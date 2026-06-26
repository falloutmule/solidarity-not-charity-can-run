# Source / Release Policy — Solidarity Not Charity Can Run

## Shipped artifact (today)

- **`index.html` at the repository root** is the current **shipped single-file game**.
- **GitHub Pages** serves this root `index.html` (no `dist/` gate yet).
- Runtime: **one HTML file** with inline CSS and inline JavaScript. **No external runtime JS/CSS/assets.**

## Development direction (source-first)

- Hermes and humans may edit **`index.html`** directly while the project remains single-file at release.
- An optional **`src/`** tree documents the **target module map** and constitution reference; it is **not** the live runtime until a build pipeline is proven.
- **Readable source may become modular over time.** The **release artifact must always collapse to one `index.html`.**

## Build / release rules

| Rule | Policy |
|------|--------|
| External runtime deps | **Forbidden** (no CDN scripts, stylesheets, or fetch-to-play assets) |
| Tests | Run against the **artifact Pages will serve** (today: root `index.html`) |
| Minification | **Off** during active iteration |
| Terser | Allowed **later** for production size passes |
| Roadroller | **Not used** unless there is an explicit size-competition goal |
| q1k3 | **Reference only** — not a required engine swap |

## When a build pipeline exists

- A script (e.g. `scripts/build-singlefile.js`) produces **`dist/index.html`** (or copies verified output to root `index.html`).
- **Canonical source** switches only after **byte/behavior parity** is proven and **`node tests/run_selfcheck_playwright.js`** passes against the **built** artifact.
- Until then: **Option A** — edit root `index.html`, keep harness green.

## Backups

- Before large refactors, copy `index.html` to `index.before-<topic>.html` in the repo root.

## Verification gate

Every change must pass:

- Static AI-safe constitution check (`proof-ai-safe-constitution.json`)
- Release artifact check (`proof-release-artifact.json`)
- Full Playwright harness (`proof-playwright-summary.json`)

No push if the harness tests dev-only files while Pages serves a different path.

## Related documentation

- **`docs/README.md`** — docs index (harness, Pages, mobile, handoff)
- **`PROJECT_STATUS.md`** — current BUILD_ID, URLs, completed cards
- **`reports/README.md`** — guard report index (files remain in repo root)