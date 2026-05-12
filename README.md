# Qeex GitHub Email

A React + Vite Cloudflare Pages app for ordering GitHub activation emails through the Qeex API.

## Features

- Browser-remembered Qeex API key using `localStorage`
- Current balance display with 4 decimals
- Fixed activation target `github.com`
- Fixed mailbox domain `yandex.com`
- 20-minute activation countdown
- 1-second polling for activation code
- Copy buttons for email and code
- Cloudflare Pages Function proxy for Qeex API requests

## Cloudflare Pages

Use these settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: project root

The app includes a Pages Function under `functions/api/qeex/[[path]].js`, so deploy it as a Cloudflare Pages project with Functions enabled.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server does not run Cloudflare Pages Functions by itself. For full local proxy testing, use Cloudflare's Wrangler Pages workflow.
