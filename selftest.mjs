#!/usr/bin/env node
/* selftest — runs the real thing against the live record, the way a client would.

   1. MCP over stdio: initialize, the initialized notification, tools/list, then every tool
      called once, plus an unknown tool and a bad card id (both must fail cleanly).
   2. The command line: every command once, human and --json.
   Exits non-zero on the first thing that is wrong. Usage: node selftest.mjs */
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const NI = path.join(HERE, 'ni.mjs')
let failures = 0
const ok = (cond, what, detail = '') => {
  console.log(`${cond ? '  ok  ' : '  FAIL'} ${what}${detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

/* ── 1 · MCP ─────────────────────────────────────────────────────────── */
console.log('MCP over stdio')
const child = spawn(process.execPath, [NI, 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] })
const pending = new Map()
let buf = ''
child.stdout.setEncoding('utf8')
child.stdout.on('data', (d) => {
  buf += d
  let i
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i)
    buf = buf.slice(i + 1)
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      ok(false, 'stdout carries only JSON-RPC', line.slice(0, 80))
      continue
    }
    pending.get(msg.id)?.(msg)
    pending.delete(msg.id)
  }
})
let nextId = 1
const rpc = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 45000)
    pending.set(id, (m) => {
      clearTimeout(timer)
      resolve(m)
    })
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  })

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'selftest', version: '1' } })
ok(init.result?.serverInfo?.name === 'nostradamus-intellect', 'initialize', `${init.result?.serverInfo?.title} ${init.result?.serverInfo?.version}, protocol ${init.result?.protocolVersion}`)
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)

const list = await rpc('tools/list', {})
const tools = list.result?.tools || []
ok(tools.length >= 10 && tools.every((t) => t.name && t.description && t.inputSchema?.type === 'object' && t.annotations?.readOnlyHint), 'tools/list', `${tools.length} tools, all read-only with schemas`)

const CALLS = [
  ['record_summary', {}, (o) => o.counts?.ledger_seals > 0 && o.first_verdict],
  ['search_cards', { query: 'ukraine' }, (o) => o.matched > 0],
  ['search_cards', { kind: 'statement' }, (o) => o.cards.every((c) => c.kind === 'sealed-statement')],
  ['get_card', { id: 'CAL-12' }, (o) => o.code === 'CAL-12' && o.sha256 && o.resolution_criteria],
  ['get_card', { id: 'ZUC-01' }, (o) => o.speaker && o.quote && o.probability === 27],
  ['resolution_calendar', { limit: 5 }, (o) => o.items.length > 0 && o.items.every((c, i, a) => !i || a[i - 1].resolve_by <= c.resolve_by)],
  ['verify_seal', { id: 'CAL-12' }, (o) => o.verified === true],
  ['verify_seal', { id: 'all' }, (o) => o.all_verified === true && o.ledger_root?.verified === true],
  ['loom_state', {}, (o) => o.threads?.length === 6 && o.threads.every((t) => t.strands.length === 6)],
  ['sector_pressure', {}, (o) => o.state && o.thresholds],
  ['alert_log', {}, (o) => Number.isFinite(o.total)],
  ['wire', { limit: 5 }, (o) => o.items.length > 0],
  ['event_or_echo', { text: 'ukraine russia strikes' }, (o) => Array.isArray(o.matches)],
  ['sensors', {}, (o) => o.sensors.length > 0],
]
for (const [name, args, check] of CALLS) {
  const r = await rpc('tools/call', { name, arguments: args })
  const outData = r.result?.structuredContent
  let passed = false
  try {
    passed = !r.result?.isError && Boolean(check(outData))
  } catch {
    passed = false
  }
  ok(passed, `tools/call ${name} ${JSON.stringify(args)}`, r.result?.isError ? r.result.content?.[0]?.text : '')
}
const bad = await rpc('tools/call', { name: 'no_such_tool', arguments: {} })
ok(Boolean(bad.error), 'an unknown tool is refused', bad.error?.message)
const missing = await rpc('tools/call', { name: 'get_card', arguments: { id: 'NOPE-99' } })
ok(missing.result?.isError === true, 'a bad card id fails cleanly', missing.result?.content?.[0]?.text)
const unknown = await rpc('no/such/method', {})
ok(unknown.error?.code === -32601, 'an unknown method answers -32601')
child.kill()

/* ── 2 · the command line ─────────────────────────────────────────────── */
console.log('\nthe command line')
const run = (...a) => execFileSync(process.execPath, [NI, ...a], { encoding: 'utf8', timeout: 60000 })
for (const cmd of [['summary'], ['cards', 'ai'], ['card', 'CAL-12'], ['calendar', '5'], ['verify', 'CAL-12'], ['verify', 'all'], ['loom'], ['pressure'], ['alerts'], ['wire', '3'], ['echo', 'ukraine', 'strikes'], ['sensors'], ['tools'], ['--version']]) {
  try {
    const text = run(...cmd)
    ok(text.trim().length > 0 && !/MISMATCH/.test(text), `ni ${cmd.join(' ')}`, text.split('\n')[0].slice(0, 90))
  } catch (e) {
    ok(false, `ni ${cmd.join(' ')}`, String(e.stderr || e.message).slice(0, 120))
  }
}
try {
  JSON.parse(run('card', 'TEC-04', '--json'))
  ok(true, 'ni card TEC-04 --json is valid JSON')
} catch {
  ok(false, 'ni card TEC-04 --json is valid JSON')
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed')
process.exit(failures ? 1 : 0)
