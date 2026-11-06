import urls from '../config.js'

const PORT = Number(process.env.PORT ?? 3000)
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL
if (!WEBHOOK) throw new Error('DISCORD_WEBHOOK_URL is not set')

const INTERVAL_MS = 2 * 60_000
const TIMEOUT_MS = 10_000
const RETRY_DELAY_MS = 10_000
const DISCORD_MAX_LENGTH = 2000

type Target = { url: string; host: string; isUp?: boolean }

const targets: Target[] = urls
  .map((url) => ({ url, host: new URL(url).hostname }))
  .toSorted((a, b) => a.host.localeCompare(b.host))

const ping = async (url: string) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    await res.body?.cancel()
    return res.status === 200
  } catch {
    return false
  }
}

// One retry, so a service restarting for a deploy does not raise an alert
const pingWithRetry = async (url: string) => {
  if (await ping(url)) return true
  await Bun.sleep(RETRY_DELAY_MS)
  return ping(url)
}

const check = async (target: Target) => {
  const wasUp = target.isUp
  target.isUp = await pingWithRetry(target.url)
  if (wasUp === true && !target.isUp) return `🔴 **${target.host}** is down`
  if (wasUp === false && target.isUp) return `🟢 **${target.host}** is back up`
}

const notify = async (content: string) => {
  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, DISCORD_MAX_LENGTH) }),
    })
    if (!res.ok) console.error(`Discord webhook failed: ${res.status}`)
  } catch (error) {
    console.error('Discord webhook failed', error)
  }
}

// One message per round, so an outage of everything stays under Discord's rate limit
const checkAll = async () => {
  const changes = (await Promise.all(targets.map(check))).filter(Boolean)
  if (changes.length > 0) await notify(changes.join('\n'))
}

const page = () => `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="60" />
<title>Pinger</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.5 system-ui, sans-serif; margin: 1.5rem; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 0.25rem 1rem; }
  div { white-space: nowrap; }
  @media (max-width: 600px) {
    body { font-size: 11px; margin: 0.5rem; }
    main { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.2rem 0.5rem; }
  }
</style>
<main>
${targets.map(({ isUp, host }) => `<div>${isUp ? '🟢' : '🔴'} ${host}</div>`).join('\n')}
</main>
</html>
`

await checkAll()
setInterval(checkAll, INTERVAL_MS)

Bun.serve({
  port: PORT,
  fetch: () =>
    new Response(page(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    }),
})

console.log(`Pinging ${targets.length} URLs every 2 minutes, page on port ${PORT}`)
