# Changelog

## [1.0.1]
### Changed
- The file HACS loads (`dist/`) is now minified at build time (esbuild): ~18% smaller raw. No behaviour change — `src/` stays the readable source of truth; all 335 render checks pass unchanged.
- The loaded file now prints its version to the console (`SF-TRACE v1.0.1`) and warns, instead of silently redefining the cards, if the resource is declared twice (HACS + a manual file) — same pattern as SF-Cards. Verified in a real browser: second load is ignored with a clear warning, version banner confirmed.

## [1.0.0] — 2026-11-04
### Added
- `sf-trace-card`: origin of every state change (person, automation, service, entity, device), filters, light and dark themes, en/fr/de/es.
- Throttled logbook reads (15 s minimum interval), error state, render tests in headless Chrome.
