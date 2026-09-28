# Nostradamus Intellect — MCP server and CLI

Ask the public record of **Nostradamus Intellect** from Claude, Cursor, any MCP client or your terminal: every forecast
sealed with a probability, a resolution date and a condition that would prove it wrong — then graded in public.
Search the record, read any card whole, see what is judged next, check whether a headline is an event or an echo,
and **verify a seal's SHA-256 yourself** instead of trusting us.

Read-only and free. No key, no account, no dependencies (Node 18+). The numbers are the same ones every reader sees
on the site — paying never changes a probability.

**Website:** [nostradamusintellect.com](https://nostradamusintellect.com) · **The record as JSON:**
[/engine/record.json](https://nostradamusintellect.com/engine/record.json) · **For language models:**
[llms.txt](https://nostradamusintellect.com/llms.txt) · **The protocol:**
[nostradamus-intellect-protocol](https://github.com/NostradamusIntellect/nostradamus-intellect-protocol)

> 0 sealed cards have been graded yet. The first public verdict is **2027-02-28**. Do not quote an accuracy rate —
> there is none, and `record_summary` says so.

## Connect it to an AI client (stdio)

**Claude Desktop, Cursor, Windsurf, VS Code and other MCP clients:**

```json
{
  "mcpServers": {
    "nostradamus-intellect": {
      "command": "npx",
      "args": ["-y", "github:NostradamusIntellect/nostradamus-intellect-mcp", "mcp"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add nostradamus-intellect -- npx -y github:NostradamusIntellect/nostradamus-intellect-mcp mcp
```

Then ask things like *"What does the Nostradamus Intellect record say about a Ukraine ceasefire?"*,
*"What is judged next?"*, *"Verify seal CAL-12"*, or *"Is this headline an event or an echo?"*

## Tools

| Tool | What it returns |
|---|---|
| `record_summary` | Counts, graded (0), the first verdict date, and the ledger arithmetic: how many misses a perfectly calibrated forecaster would still expect on these exact numbers |
| `search_cards` | Ledger seals, projections and sealed statements of public figures, by words, kind or domain |
| `get_card` | One card, whole: probability, dates, resolution criterion or kill-condition, receipts, SHA-256 and timestamp proof — plus the live lean, shown separately (bounded ±7; the seal never moves) |
| `resolution_calendar` | Graded cards in the order they resolve, with days left |
| `verify_seal` | Recomputes a seal's SHA-256 (or the ledger root over all seals) from its sealed fields and compares it with the published hash |
| `loom_state` | The engine's 36 named strands (6 threads × 6), stepping every six hours on a published rule |
| `sector_pressure` | Strands straining past the published alert bar (z ≥ 2.5, ≥ 3 independent wires, floor 0.12 over 72 h) |
| `alert_log` | The append-only public alert log |
| `wire` | The newest headlines from the eight live wires the engine reads |
| `event_or_echo` | How many independent wires carried a story, and the confirmation weight the engine gave it |
| `sensors` | The public sensor readings (the lead sensor of each group) |

All tools are annotated `readOnlyHint: true`. Nothing here can write to the record.

## CLI

```bash
npx -y github:NostradamusIntellect/nostradamus-intellect-mcp summary
npx -y github:NostradamusIntellect/nostradamus-intellect-mcp cards ukraine
npx -y github:NostradamusIntellect/nostradamus-intellect-mcp card CAL-12
npx -y github:NostradamusIntellect/nostradamus-intellect-mcp calendar 10
npx -y github:NostradamusIntellect/nostradamus-intellect-mcp verify all
npx -y github:NostradamusIntellect/nostradamus-intellect-mcp echo "strikes on ukraine"
```

Or install it once — `npm install -g github:NostradamusIntellect/nostradamus-intellect-mcp` — then run `ni summary`,
`ni card ZUC-01`, `ni verify CAL-12`, `ni loom`. Add `--json` to any command for raw JSON.

```
$ ni verify all
MATCH    CAL-01  1f27008c675874fffe29683d0b73ee7a4b2fff96de71093ee38b3e07464b1257
…
ledger root MATCH  adbe641961a8fa194fe22e3063f57362df8bd3e959a0e327f2e4b7b39c570ff8
Every seal is exactly what was stamped.
```

## How to quote a number from it

`[CODE] — [claim] — sealed at [p]% on [date] — resolves [date] — correct if [criterion]. Status PENDING.`
A projection is a narrative window, not a scored seal; ledger seals and sealed statements are the graded record.
The live lean is a bounded reading of the engine, never a revised forecast.

## Test it

```bash
npm test     # or: node selftest.mjs
```

Runs the MCP handshake over stdio (initialize, tools/list, every tool, the error paths) and every CLI command against
the live record.

## Work with us

Nostradamus Intellect is built in the open by one founder. We are looking for people:

- **Builders:** see [where we need help](CONTRIBUTING.md) — a remote (HTTP) MCP endpoint, a Python client, framework
  adapters, reliability diagrams from the record, translations. Issues and pull requests are welcome. We are open to
  people who want to join the founding team: engineers, forecasters, data and research people.
- **Forecasters and researchers:** seal your own numbers against the record through the
  [Observer Protocol](https://nostradamusintellect.com/observers) and be graded by the same rule on the same date.
  A sharp critique of the method is the most useful thing you can send.
- **Newsrooms, platforms and institutions:** the record as data, embeddable cards, questions commissioned by you and
  sealed and graded in public, calibration training for teams.
- **Investors:** [nostradamusintellect@proton.me](mailto:nostradamusintellect@proton.me).
- **Donors and supporters:** reading the record is free forever, with no ads and no trackers. If you want to help keep
  it that way, write to us.
- **Agents:** connect through this MCP server, or read [/engine/record.json](https://nostradamusintellect.com/engine/record.json)
  and [/llms.txt](https://nostradamusintellect.com/llms.txt). No key needed.
- **Found a wrong number, a broken criterion or a seal that does not verify?** Open an issue. Corrections are public and
  dated; a sealed probability is never rewritten.

Nothing can be bought: partnerships, sponsorship, donations and investment never change a probability, a date or a
criterion.

[nostradamusintellect.com](https://nostradamusintellect.com) · [X @Nostradamusmind](https://x.com/Nostradamusmind) ·
[nostradamusintellect@proton.me](mailto:nostradamusintellect@proton.me)

## Licence

Apache-2.0 for the code in this repository. The record it reads is Nostradamus Intellect's, published under CC BY 4.0:
cite the card code, the probability, the resolution date and the URL.

<sub>Not financial, medical, legal or safety advice. Every forward-looking figure is probabilistic simulation. Nothing
here is a reading of Michel de Nostredame.</sub>
