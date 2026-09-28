#!/usr/bin/env node
/* ni — Nostradamus Intellect from the command line, and an MCP server for AI agents.

   Read-only. No dependencies: Node 18+ (global fetch, node:crypto). Everything comes from the
   public record at https://nostradamusintellect.com — the same numbers every reader sees, free
   and paid alike. No key, no account.

   ni summary                   the record in one screen: counts, first verdict, the ledger arithmetic
   ni cards [words] [--kind k]  search the record (k: seal | projection | statement)
   ni card <id|code|slug>       one card, whole, with its live lean
   ni calendar [n]              what is judged next
   ni verify <code|all>         recompute a seal's SHA-256 (or the ledger root) yourself
   ni loom                      the engine's 36 strands right now
   ni pressure                  which strands are straining past the published alert bar
   ni alerts                    the public alert log
   ni wire [n]                  the latest headlines from the eight live wires
   ni echo <headline words>     event or echo? how many independent wires carried a story
   ni sensors                   the public sensor readings
   ni mcp                       run as an MCP server over stdio (for Claude, Cursor, any MCP client)
   ni tools                     list the MCP tools

   Add --json to any command for raw JSON. NI_BASE_URL overrides the origin.

   Nothing here is financial, medical, legal or safety advice. Forward-looking content is
   probabilistic simulation. A sealed probability is never rewritten. */
import { createHash } from 'node:crypto'

const BASE = (process.env.NI_BASE_URL || 'https://nostradamusintellect.com').replace(/\/+$/, '')
const VERSION = '0.1.0'
const UA = `nostradamus-intellect-cli/${VERSION} (+https://github.com/NostradamusIntellect/nostradamus-intellect-mcp)`
const TTL = 10 * 60 * 1000

/* ── reading the public record ─────────────────────────────────────────── */
const cache = new Map()
async function get(path, { ttl = 60 * 1000 } = {}) {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < ttl) return hit.data
  const r = await fetch(BASE + path, { headers: { accept: 'application/json', 'user-agent': UA }, signal: AbortSignal.timeout(25000) })
  if (!r.ok) throw new Error(`${BASE}${path} answered HTTP ${r.status}`)
  const data = await r.json()
  cache.set(path, { at: Date.now(), data })
  return data
}
const record = () => get('/engine/record.json', { ttl: TTL })
const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null)
const daysTo = (date) => {
  const t = Date.parse(`${date}T23:59:59Z`)
  return Number.isFinite(t) ? Math.max(0, Math.ceil((t - Date.now()) / 86400000)) : null
}
const sha256 = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const KIND = { seal: 'ledger-seal', seals: 'ledger-seal', projection: 'projection', projections: 'projection', statement: 'sealed-statement', statements: 'sealed-statement', claim: 'sealed-statement' }

async function findCard(q) {
  const r = await record()
  const k = String(q || '').trim().toLowerCase()
  if (!k) throw new Error('give a card id, code (e.g. CAL-12) or slug')
  const hit =
    r.cards.find((c) => c.id.toLowerCase() === k || String(c.code).toLowerCase() === k) ||
    r.cards.find((c) => c.url.toLowerCase().endsWith(`/${k}`))
  if (!hit) throw new Error(`no card "${q}" — try: ni cards ${q}`)
  return hit
}

/* ── the tools (shared by the CLI and the MCP server) ───────────────────── */
const TOOLS = [
  {
    name: 'record_summary',
    title: 'The record in one screen',
    description:
      'Counts of sealed forecasts, how many are graded (none yet), the first public verdict date, and the ledger arithmetic — how many misses a perfectly calibrated forecaster would still expect on these exact numbers. Start here.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const r = await record()
      return { name: r.name, generated_at: r.generated_at, counts: r.counts, first_verdict: r.first_verdict, days_to_first_verdict: daysTo(r.first_verdict), ledger_arithmetic: r.ledger_arithmetic, contract: r.contract, record_url: `${BASE}/engine/record.json`, site: BASE }
    },
  },
  {
    name: 'search_cards',
    title: 'Search the record',
    description:
      'Find sealed ledger entries, live projections and sealed statements of public figures by words, kind or domain. Returns probability, resolution date, status and the card URL. Ledger seals and sealed statements are graded; projections are not.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to match in the title or code, e.g. "ukraine ceasefire", "CAL-12", "zuckerberg"' },
        kind: { type: 'string', enum: ['seal', 'projection', 'statement'], description: 'Limit to one kind of card' },
        domain: { type: 'string', description: 'e.g. geopolitics, finance, technology, climate, crypto, society, space' },
        limit: { type: 'integer', minimum: 1, maximum: 60, default: 20 },
      },
      additionalProperties: false,
    },
    run: async ({ query = '', kind, domain, limit = 20 } = {}) => {
      const r = await record()
      const words = String(query).toLowerCase().split(/\s+/).filter(Boolean)
      const want = kind ? KIND[String(kind).toLowerCase()] : null
      const cards = r.cards
        .filter((c) => !want || c.kind === want)
        .filter((c) => !domain || String(c.domain || '').toLowerCase().startsWith(String(domain).toLowerCase().slice(0, 4)))
        .filter((c) => {
          const hay = `${c.code} ${c.id} ${c.title}`.toLowerCase()
          return words.every((w) => hay.includes(w))
        })
        .slice(0, Math.min(60, Number(limit) || 20))
      return { matched: cards.length, cards }
    },
  },
  {
    name: 'get_card',
    title: 'One card, whole',
    description:
      'Everything on one card: the sealed probability, dates, resolution criterion or kill-condition, receipts, and for ledger seals the SHA-256 and timestamp proof. Adds the live lean — the engine’s current reading, bounded to ±7 points and shown separately; the sealed number never moves.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Card id, code (e.g. CAL-12, ZUC-01, TEC-04) or URL slug' } },
      required: ['id'],
      additionalProperties: false,
    },
    run: async ({ id } = {}) => {
      const hit = await findCard(id)
      const card = await get(new URL(hit.json).pathname, { ttl: TTL })
      let live_lean = null
      try {
        const leans = await get('/api/cores?view=leans&days=14')
        const l = leans?.leans?.[card.id]
        if (l && Number.isFinite(l.last)) {
          live_lean = {
            sealed_probability: card.probability,
            live_reading: Math.max(2, Math.min(97, card.probability + l.last)),
            offset_points: l.last,
            raw_nowcast_points: l.nowcast ?? null,
            window_days: leans.window,
            note: 'The engine’s current lean, bounded to ±7 points of the seal. A reading, never a revision: the sealed probability does not move.',
          }
        }
      } catch {
        /* the lean is a courtesy; the card stands on its own */
      }
      const { contract, source, ...rest } = card
      return { ...rest, days_to_resolution: daysTo(card.resolve_by), live_lean, contract }
    },
  },
  {
    name: 'resolution_calendar',
    title: 'What is judged next',
    description: 'Graded cards (ledger seals and sealed statements) in the order they resolve, with days left. Each verdict follows the published procedure: the named source read on the date, then a 72-hour public challenge window.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD, default today' },
        to: { type: 'string', description: 'YYYY-MM-DD' },
        limit: { type: 'integer', minimum: 1, maximum: 60, default: 12 },
      },
      additionalProperties: false,
    },
    run: async ({ from, to, limit = 12 } = {}) => {
      const r = await record()
      const lo = from || new Date().toISOString().slice(0, 10)
      const items = r.calendar
        .filter((c) => c.resolve_by >= lo && (!to || c.resolve_by <= to))
        .slice(0, Math.min(60, Number(limit) || 12))
        .map((c) => ({ ...c, days_left: daysTo(c.resolve_by) }))
      return { from: lo, to: to || null, items }
    },
  },
  {
    name: 'verify_seal',
    title: 'Verify a seal yourself',
    description:
      'Recompute a ledger seal’s SHA-256 from its sealed fields and compare it with the published hash (or, with "all", recompute the ledger root over all seals). Proves the number was not edited since it was stamped; the linked OpenTimestamps proof anchors the hash to Bitcoin.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'A ledger seal code or id (e.g. CAL-12), or "all" for every seal plus the ledger root' } },
      required: ['id'],
      additionalProperties: false,
    },
    run: async ({ id } = {}) => {
      const r = await record()
      const seals = r.cards.filter((c) => c.kind === 'ledger-seal')
      const check = async (c) => {
        const card = await get(new URL(c.json).pathname, { ttl: TTL })
        if (!card.sealed) return { code: c.code, verified: null, reason: 'this card carries no sealed fields' }
        const mine = sha256(card.sealed)
        return { code: card.code, id: card.id, recomputed: mine, published: card.sha256, verified: mine === card.sha256, timestamp_proof: card.timestamp_proof, sealed_fields: card.sealed_fields, card }
      }
      if (String(id).toLowerCase() === 'all') {
        const results = []
        for (const c of seals) results.push(await check(c))
        const root = sha256(results.map((x) => x.card?.sealed))
        const published = results[0]?.card?.ledger_root || null
        return {
          seals: results.map(({ card, ...x }) => x),
          all_verified: results.every((x) => x.verified),
          ledger_root: { recomputed: root, published, verified: root === published },
          how: 'SHA-256 of JSON.stringify(sealed) per seal; the root is SHA-256 of JSON.stringify of the list of sealed objects in ledger order.',
        }
      }
      const hit = await findCard(id)
      if (hit.kind !== 'ledger-seal') throw new Error(`${hit.code} is a ${hit.kind}; only ledger seals carry a stamped hash`)
      const { card, ...res } = await check(hit)
      return { ...res, sealed: card?.sealed, how: 'SHA-256 of JSON.stringify(sealed), fields in the stamped order.' }
    },
  },
  {
    name: 'loom_state',
    title: 'The engine right now',
    description:
      'The Loom: six threads × six named strands, advanced every six hours under a published rule and moved by wire headlines. Values run from −1 to +1. It tracks how far the world has moved; it does not write the sealed probabilities.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const c = await get('/api/cores')
      return {
        version: c.version,
        last_step: iso(c.lastAdvance),
        next_step_due: iso(c.nextAdvanceDue),
        threads: (c.threads || []).map((t) => ({
          id: t.id,
          name: t.name,
          drift: t.drift,
          posture: t.posture,
          strands: (t.axes || []).map((a, i) => ({ key: a.key || a, label: a.label || a.key || a, value: t.s?.[i] ?? null })),
        })),
      }
    },
  },
  {
    name: 'sector_pressure',
    title: 'Which strands are straining',
    description:
      'Strands whose recent push stands out against their own 30-day history. An alert needs z ≥ 2.5, at least 3 independent wires and a floor of 0.12 over 72 hours — most weeks nothing clears it.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const p = await get('/api/cores?view=pressure')
      return {
        state: p.state,
        window_hours: p.windowH,
        thresholds: p.thresholds,
        strands: (p.strands || []).map((s) => ({ strand: s.label, thread: s.threadLabel, level: s.level, direction: s.direction, z: s.z, independent_wires: s.sources, push: s.signed })),
        threads: p.threads,
      }
    },
  },
  {
    name: 'alert_log',
    title: 'The public alert log',
    description: 'Every alert that opened or cleared, appended to a log nothing deletes. The public view shows the latest entries; the full log opens with a pass.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const a = await get('/api/cores?view=alertlog')
      return {
        total: a.total,
        shown: (a.entries || []).length,
        withheld_in_public_view: a.withheld ?? 0,
        since: a.startedAt,
        entries: (a.entries || []).map((e) => ({ at: iso(e.ts), kind: e.kind, strand: e.label, thread: e.threadLabel, direction: e.direction, z: e.z, independent_wires: e.sources })),
      }
    },
  },
  {
    name: 'wire',
    title: 'The latest headlines',
    description: 'The newest headlines from the eight live wires the engine reads (BBC World, UN News, NASA, ECB, Al Jazeera, NPR World, USGS, Wikimedia), as cached every ten minutes.',
    inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 24, default: 12 } }, additionalProperties: false },
    run: async ({ limit = 12 } = {}) => {
      const n = await get('/api/news')
      return { cached_at: iso(n.cachedAt), items: (n.items || []).slice(0, Math.min(24, Number(limit) || 12)).map((i) => ({ wire: i.feed, title: i.title, link: i.link, published: i.pubDate })) }
    },
  },
  {
    name: 'event_or_echo',
    title: 'Event or echo?',
    description:
      'Given a headline or a few of its words, find it in the last 48 hours of engine impulses and say how many independent wires carried the story. One wire counts at half weight, two at three quarters, three or more in full: repetition by one outlet does not move the engine as far as agreement between three.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'The headline, or distinctive words from it' } },
      required: ['text'],
      additionalProperties: false,
    },
    run: async ({ text = '' } = {}) => {
      const words = String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3)
      if (!words.length) throw new Error('give the headline or a few distinctive words from it')
      const need = Math.min(2, words.length)
      const score = (h) => words.filter((w) => String(h).toLowerCase().includes(w)).length
      const w = await get('/api/cores?view=wires&days=2')
      const byHeadline = new Map()
      for (const row of w.rows || []) {
        for (const imp of row.impulses || []) {
          if (!imp.headline || score(imp.headline) < need) continue
          const e = byHeadline.get(imp.headline) || { headline: imp.headline, wire: imp.feed, at: iso(row.ts), independent_wires: imp.feeds, confirmation_weight: imp.w, stories_clustered: imp.cluster, strands: [] }
          e.strands.push({ strand: imp.ref, push: imp.delta })
          byHeadline.set(imp.headline, e)
        }
      }
      const reading = (n) => (n >= 3 ? `an event — carried by ${n} independent wires, counted in full` : n === 2 ? 'corroborated — two independent wires, counted at three quarters' : 'single source — one wire so far, counted at half weight (a scoop or an echo; time will tell)')
      const matches = [...byHeadline.values()].sort((a, b) => b.independent_wires - a.independent_wires).slice(0, 8).map((m) => ({ ...m, reading: reading(m.independent_wires) }))
      if (matches.length) return { query: text, matches }
      const news = await get('/api/news')
      const seen = (news.items || []).filter((i) => score(i.title) >= need).slice(0, 5).map((i) => ({ wire: i.feed, title: i.title, published: i.pubDate }))
      return {
        query: text,
        matches: [],
        reading: seen.length ? 'seen on the wire, but it moved no strand — the lexicon matched nothing in it' : 'not carried by the eight wires in the last 48 hours',
        seen_on_wire: seen,
      }
    },
  },
  {
    name: 'sensors',
    title: 'Public sensor readings',
    description: 'The latest readings of the public sensors (climate, hazards, money, energy, households, order, crowd). The public view shows the lead sensor of each group live; a pass opens the rest and their history.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const s = await get('/api/cores?view=sensors')
      const open = (s.sensors || []).filter((x) => x.latest)
      return { read_at: s.at, open: s.open, total: s.total, note: 'Public cut: the lead sensor of each group. A pass opens every sensor and its history.', sensors: open.map((x) => ({ key: x.key, latest: x.latest, points: x.points, status: s.status?.[x.key] || null })) }
    },
  },
]
const TOOL = Object.fromEntries(TOOLS.map((t) => [t.name, t]))

/* ── the MCP server: newline-delimited JSON-RPC 2.0 over stdio ──────────── */
const INSTRUCTIONS =
  'Nostradamus Intellect is a public instrument of record: every forecast carries a probability, a resolution date and a condition that would prove it wrong, sealed before the outcome and graded in public. Quote the card code, the probability, the resolution date and the criterion. Never invent an accuracy rate: no card has been graded yet unless record_summary says otherwise. The live lean is a bounded reading, not a revised forecast. Nothing here is financial, medical, legal or safety advice.'

function mcp() {
  const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`)
  const handle = async (msg) => {
    const { id, method, params } = msg || {}
    const reply = (result) => id !== undefined && id !== null && send({ jsonrpc: '2.0', id, result })
    const fail = (code, message) => id !== undefined && id !== null && send({ jsonrpc: '2.0', id, error: { code, message } })
    try {
      if (method === 'initialize') {
        return reply({
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'nostradamus-intellect', title: 'Nostradamus Intellect', version: VERSION },
          instructions: INSTRUCTIONS,
        })
      }
      if (typeof method === 'string' && method.startsWith('notifications/')) return undefined
      if (method === 'ping') return reply({})
      if (method === 'tools/list') {
        return reply({ tools: TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema, annotations: { readOnlyHint: true, openWorldHint: true } })) })
      }
      if (method === 'resources/list') return reply({ resources: [] })
      if (method === 'prompts/list') return reply({ prompts: [] })
      if (method === 'tools/call') {
        const tool = TOOL[params?.name]
        if (!tool) return fail(-32602, `unknown tool: ${params?.name}`)
        try {
          const out = await tool.run(params?.arguments || {})
          return reply({ content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], structuredContent: out, isError: false })
        } catch (e) {
          return reply({ content: [{ type: 'text', text: String(e?.message || e) }], isError: true })
        }
      }
      return fail(-32601, `method not found: ${method}`)
    } catch (e) {
      return fail(-32603, String(e?.message || e))
    }
  }
  let buf = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => {
    buf += chunk
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (!line) continue
      let msg
      try {
        msg = JSON.parse(line)
      } catch {
        send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })
        continue
      }
      for (const m of Array.isArray(msg) ? msg : [msg]) handle(m)
    }
  })
  process.stdin.on('end', () => process.exit(0))
  process.stderr.write(`nostradamus-intellect MCP ${VERSION} · reading ${BASE} · ${TOOLS.length} read-only tools\n`)
}

/* ── the command line ──────────────────────────────────────────────────── */
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')
const args = argv.filter((a) => a !== '--json')
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  if (i < 0) return undefined
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const out = (x) => process.stdout.write(`${typeof x === 'string' ? x : JSON.stringify(x, null, 2)}\n`)
const pct = (p) => `${String(p).padStart(3)}%`

async function cli() {
  const kind = flag('kind')
  const [cmd, ...rest] = args
  const show = async (name, input, human) => {
    const data = await TOOL[name].run(input)
    out(JSON_OUT || !human ? data : human(data))
  }
  switch (cmd) {
    case 'summary':
      return show('record_summary', {}, (d) => {
        const a = d.ledger_arithmetic?.all || {}
        return [
          `${d.name}`,
          `  ${d.counts.ledger_seals} ledger seals · ${d.counts.projections} projections · ${d.counts.sealed_statements} sealed statements · ${d.counts.graded} graded`,
          `  first public verdict: ${d.first_verdict} (${d.days_to_first_verdict} days)`,
          `  a perfectly calibrated forecaster would still miss ~${a.expectedMisses} of ${a.n} seals; expected Brier ${a.expectedBrier} ± ${a.sd} (coin flip 0.25)`,
          `  ${d.contract?.sealed}`,
          `  ${d.record_url}`,
        ].join('\n')
      })
    case 'cards':
      return show('search_cards', { query: rest.join(' '), kind, limit: 40 }, (d) =>
        d.cards.length ? d.cards.map((c) => `${String(c.code).padEnd(7)} ${pct(c.probability)}  ${String(c.resolve_by || '').padEnd(10)}  ${c.kind === 'projection' ? '·' : '◆'} ${c.title}`).join('\n') + `\n\n◆ graded · projection unscored · ${d.matched} shown` : 'no card matched'
      )
    case 'card':
      return show('get_card', { id: rest.join(' ') }, (c) =>
        [
          `${c.code} · ${c.kind}${c.speaker ? ` · ${c.speaker}` : ''}`,
          `  ${c.title}`,
          c.quote ? `  “${c.quote}” — said ${c.said_on}, ${c.venue}` : null,
          `  sealed at ${c.probability}%${c.sealed_on ? ` on ${c.sealed_on}` : ''} · resolves ${c.resolve_by} (${c.days_to_resolution} days) · ${c.status}${c.scored === false ? ' · not scored' : ''}`,
          c.live_lean ? `  live lean ${c.live_lean.live_reading}% (${c.live_lean.offset_points >= 0 ? '+' : ''}${c.live_lean.offset_points}, bounded ±7) — the seal stays ${c.probability}%` : null,
          c.resolution_criteria ? `  CORRECT IF: ${String(c.resolution_criteria).replace(/^CORRECT if,?\s*/i, '')}` : null,
          c.falsifiability ? `  WRONG IF: ${c.falsifiability}` : null,
          c.sha256 ? `  sha256 ${c.sha256}  (verify: ni verify ${c.code})` : null,
          `  ${c.url}`,
        ].filter(Boolean).join('\n')
      )
    case 'calendar':
      return show('resolution_calendar', { limit: Number(rest[0]) || 12 }, (d) => d.items.map((c) => `${c.resolve_by}  ${String(c.days_left).padStart(4)}d  ${String(c.code).padEnd(7)} ${pct(c.probability)}  ${c.title}`).join('\n'))
    case 'verify':
      return show('verify_seal', { id: rest[0] || 'all' }, (d) =>
        d.seals
          ? d.seals.map((s) => `${s.verified ? 'MATCH   ' : 'MISMATCH'} ${s.code}  ${s.recomputed}`).join('\n') + `\nledger root ${d.ledger_root.verified ? 'MATCH' : 'MISMATCH'}  ${d.ledger_root.recomputed}\n${d.all_verified && d.ledger_root.verified ? 'Every seal is exactly what was stamped.' : 'Something differs — report it: github.com/NostradamusIntellect/nostradamus-intellect-mcp/issues'}`
          : `${d.verified ? 'MATCH' : 'MISMATCH'} ${d.code}\n  recomputed ${d.recomputed}\n  published  ${d.published}\n  proof      ${d.timestamp_proof || '—'}  (anchor it to Bitcoin with: ots verify)`
      )
    case 'loom':
      return show('loom_state', {}, (d) =>
        [`Loom v${d.version} · last step ${d.last_step} · next due ${d.next_step_due}`, ...d.threads.map((t) => `\n${t.name} (${t.drift})\n` + t.strands.map((s) => `  ${s.label.padEnd(26)} ${s.value >= 0 ? '+' : ''}${Number(s.value).toFixed(3)}`).join('\n'))].join('\n')
      )
    case 'pressure':
      return show('sector_pressure', {}, (d) => `state ${d.state} · ${d.window_hours}h window · bar z≥${d.thresholds?.z}, ≥${d.thresholds?.feeds} wires\n` + (d.strands.length ? d.strands.map((s) => `  ${String(s.level).toUpperCase().padEnd(7)} ${s.strand} (${s.thread}) z ${s.z} · ${s.independent_wires} wires · ${s.direction}`).join('\n') : '  nothing straining'))
    case 'alerts':
      return show('alert_log', {}, (d) => `${d.total} entries since ${d.since} (${d.shown} shown publicly)\n` + d.entries.map((e) => `  ${e.at}  ${e.kind.padEnd(7)} ${e.strand} (${e.thread}) z ${e.z} · ${e.independent_wires} wires`).join('\n'))
    case 'wire':
      return show('wire', { limit: Number(rest[0]) || 12 }, (d) => d.items.map((i) => `  [${i.wire}] ${i.title}`).join('\n'))
    case 'echo':
      return show('event_or_echo', { text: rest.join(' ') }, (d) =>
        d.matches.length ? d.matches.map((m) => `  ${m.headline}\n    [${m.wire}] ${m.at} · ${m.reading}\n    moved: ${m.strands.map((s) => `${s.strand} ${s.push > 0 ? '+' : ''}${s.push}`).join(', ')}`).join('\n') : `  ${d.reading}${d.seen_on_wire?.length ? `\n${d.seen_on_wire.map((s) => `    [${s.wire}] ${s.title}`).join('\n')}` : ''}`
      )
    case 'sensors':
      return show('sensors', {}, (d) => `${d.open}/${d.total} open publicly · read ${d.read_at}\n` + d.sensors.map((s) => `  ${s.key.padEnd(16)} ${JSON.stringify(s.latest)}`).join('\n') + `\n${d.note}`)
    case 'tools':
      return out(TOOLS.map((t) => `${t.name.padEnd(20)} ${t.title}`).join('\n'))
    case 'mcp':
      return mcp()
    case '--version':
    case '-v':
      return out(VERSION)
    default:
      return out(
        `ni ${VERSION} — Nostradamus Intellect from the command line\n\n` +
          '  ni summary | cards [words] [--kind seal|projection|statement] | card <id|code>\n' +
          '  ni calendar [n] | verify <code|all> | loom | pressure | alerts | wire [n]\n' +
          '  ni echo <headline words> | sensors | tools | mcp        (--json for raw JSON)\n\n' +
          `Data: ${BASE} — the public record, free, the same numbers for everyone.\n` +
          'Not financial, medical, legal or safety advice. Forward-looking content is probabilistic simulation.'
      )
  }
}

cli().catch((e) => {
  process.stderr.write(`ni: ${e?.message || e}\n`)
  process.exit(1)
})
