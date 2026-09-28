# Contributing

Thank you for looking. This repository is the open, read-only door to the Nostradamus Intellect record: the `ni` CLI
and an MCP server in one dependency-free file (`ni.mjs`).

## Where we need help

- **A remote MCP endpoint.** Today the server runs locally over stdio and reads the public JSON. A stateless
  Streamable-HTTP version would let clients connect with a URL.
- **A Python client** (`pip install nostradamus-intellect`) mirroring the same tools.
- **Framework adapters** — LangChain, LlamaIndex, CrewAI, the OpenAI Agents SDK — wrapping the same eleven tools.
- **Reliability diagrams and Brier decomposition** computed from the record once verdicts exist (first one:
  2027-02-28), plus a notebook that reproduces them.
- **Recipes:** "watch the calendar and post each verdict", "alert me when a strand I care about strains",
  "compare the record with a prediction market's price".
- **Translations** of the README and the tool descriptions (French first).

## Rules that do not bend

1. **Read-only.** No tool may write to the record, and none needs a key.
2. **No dependencies.** Node 18+ built-ins only, so `npx github:…` works everywhere with nothing to audit.
3. **Never present a number as something it is not.** The sealed probability, the live lean (a bounded reading) and
   the raw nowcast are three different things and stay labelled as such. No accuracy rate before one exists.
4. **Not advice.** Nothing in a tool description or output may read as financial, medical, legal or safety advice.

## How to submit

- Open an issue first for anything larger than a fix.
- `npm test` must pass (it runs against the live record).
- Keep the style of `ni.mjs`: plain modern JavaScript, short comments that say why.

## Reporting a problem with the record itself

A seal that does not verify, a broken link, a criterion that cannot be adjudicated, a wrong translation — open an
issue with the card code. Corrections are made in public as dated addenda; a sealed probability is never rewritten.
