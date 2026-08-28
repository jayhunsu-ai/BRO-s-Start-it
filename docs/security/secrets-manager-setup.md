# Runbook: Secrets Manager Setup (Doppler or Infisical)

Covers P0 Asana task: Set up secrets manager (Doppler or Infisical) — migrate off .env files across all services.

## Why now, before there's code
Establishing the pattern before the first service exists means nothing ever has to be migrated later — every new service is born reading from the secrets manager, never from a checked-in .env.

## Recommendation
Either works at this scale and both have usable free tiers for a solo founder:
- **Doppler** — slightly more polished UI/CLI, generous free tier for personal projects.
- **Infisical** — open-source, self-hostable later if that ever matters (aligns with the portability goal in ADR 0001).

Pick whichever you'd rather live in day-to-day — the integration pattern below is the same either way.

## Steps

1. **Create an account** (Doppler: dashboard.doppler.com, or Infisical: app.infisical.com) and a project named `bro-startit`.
2. **Create environments inside it:** `dev`, `staging`, `prod` — mirrors the Anthropic Workspace split and the eventual Render/Railway environments.
3. **Load the values from `.env.example`** into the `dev` environment first (Anthropic dev key, Supabase keys for `bro-startit-dev`).
4. **Connect it to Render/Railway** once those are paid for — both platforms support pulling env vars from Doppler/Infisical directly at deploy time, so secrets never live in a Render/Railway dashboard as plaintext either.
5. **Add the CLI to local dev workflow** (`doppler run -- <command>` or `infisical run -- <command>`) so local development also never reads a real `.env` file.
6. **Delete any `.env` file from local history if one was ever created** — `.env.example` is the only env-related file that should ever be committed (already in `.gitignore`).

## Status
- [ ] Account created
- [ ] `bro-startit` project created with dev/staging/prod environments
- [ ] Dev secrets loaded
- [ ] CLI wired into local dev workflow
