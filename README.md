# Cyber Metrics Reports

One-command Docker setup for the security metrics dashboard.

## Quick start

Prereqs: Docker and Docker Compose.

```bash
docker compose up -d --build
```

Then open http://localhost:3000. The container applies migrations automatically and starts the app.

## Development

- Install deps: `npm ci`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`

## Data

The SQLite DB lives in `data/dev.db` (created automatically in the container). It is git-ignored. Use the UI settings page to install or remove sample data if needed.
