# Changelog

## Unreleased — 2026-10-17

- Wording only, no behaviour change: the site’s engine is v3 (every six-hour step reads the whole wire log
  window once; 29 weighted wires; sensors feed strands; a lexicon that reads negation). `wire` and
  `event_or_echo` describe the 29 wires; items now carry a `group` (world, tech, ai, finance, crypto, hazard,
  space, attention). The same 0.1.0 code on npm keeps working: every tool reads the live record.

## 0.1.0 — 2026-09-28

First public release, on npm as [`nostradamus-intellect`](https://www.npmjs.com/package/nostradamus-intellect).

- `ni` CLI and a stdio MCP server in one file, no dependencies.
- Eleven read-only tools: `record_summary`, `search_cards`, `get_card`, `resolution_calendar`, `verify_seal`,
  `loom_state`, `sector_pressure`, `alert_log`, `wire`, `event_or_echo`, `sensors`.
- `verify_seal` recomputes each ledger seal's SHA-256 and the ledger root from the sealed fields published at
  `/engine/cards/<id>.json`.
- `selftest.mjs`: the MCP handshake and every CLI command, run against the live record.
