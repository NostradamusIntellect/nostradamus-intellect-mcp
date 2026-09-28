# Changelog

## 0.1.0 — 2026-09-28

First public release.

- `ni` CLI and a stdio MCP server in one file, no dependencies.
- Eleven read-only tools: `record_summary`, `search_cards`, `get_card`, `resolution_calendar`, `verify_seal`,
  `loom_state`, `sector_pressure`, `alert_log`, `wire`, `event_or_echo`, `sensors`.
- `verify_seal` recomputes each ledger seal's SHA-256 and the ledger root from the sealed fields published at
  `/engine/cards/<id>.json`.
- `selftest.mjs`: the MCP handshake and every CLI command, run against the live record.
