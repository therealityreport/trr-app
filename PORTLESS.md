# TRR Portless Routes

Portless gives TRR stable local HTTPS names without fixed dev ports.

## Routes

- `https://trr.localhost` runs the Next.js web app from `apps/web`.
- `https://wordle.trr.localhost` runs the Vue Wordle app from `apps/vue-wordle`.
- `https://api.trr.localhost` runs the FastAPI backend from `../TRR-Backend`.

The Portless web command sets the app runtime to use:

- `ADMIN_APP_ORIGIN=https://trr.localhost`
- `ADMIN_APP_HOSTS=trr.localhost,admin.trr.localhost,admin.localhost,localhost,127.0.0.1,[::1]`
- `TRR_API_URL=https://api.trr.localhost`

That keeps Portless traffic on stable HTTPS names while the normal workspace
launcher (`make dev` / `make dev-hybrid`) continues to own loopback port URLs.

## Commands

From the workspace root:

```sh
make dev-portless
```

From `TRR-APP`:

```sh
PATH=/opt/homebrew/bin:$PATH pnpm run dev:portless:all
PATH=/opt/homebrew/bin:$PATH pnpm run dev:portless
PATH=/opt/homebrew/bin:$PATH pnpm run api:portless
```

`dev:portless:all` starts the app routes and API route together. Run the split
commands only when you need to restart one side independently.

`api:portless` calls `scripts/api-portless.sh`. The launcher requires `PORT`,
loads `../profiles/default.env` with override behavior, then loads
`../TRR-Backend/.env` without overriding existing values before starting
Uvicorn on `127.0.0.1:$PORT`. The package script also allows the Portless app
origins through backend CORS for direct browser-side checks.

## Checks

```sh
curl -kI https://trr.localhost
curl -kI https://wordle.trr.localhost
curl -kI https://api.trr.localhost/docs
curl -k https://api.trr.localhost/health
```

If a route does not respond, confirm the Portless service is running with
`portless service status`, then restart the matching command above.
