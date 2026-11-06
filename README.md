# pinger

Pings a list of URLs every 2 minutes. A URL is up when it answers `200`, after one retry 10 seconds
later. Shows 🟢 or 🔴 for each host, sorted alphabetically, on https://pinger.v1v2.io, and posts to
Discord when a host goes down or comes back up.

## Setup

```
bun i
cp config.sample.js config.js
cp .env.sample .env
bun dev
```

- `config.js` (gitignored): the URLs to ping. They are bundled at build time, so deploy after a change.
- `.env` (gitignored): `DISCORD_WEBHOOK_URL`.

`sh deploy.sh` deploys to wutai.
