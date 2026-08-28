# Runbook: Anthropic Workspace & Key Separation

Covers two P0 Asana tasks:
- Set up separate Anthropic Workspaces for dev/testing vs. production
- Separate Anthropic API keys per environment with spend limits and budget alerts

## Why
A leaked or over-used dev key should never be able to exhaust production's rate-limit pool or budget, and vice versa. This is the actual mitigation for "what if a key gets hacked" — not a self-hosted model (see ADR 0001).

## Steps (do in the Anthropic Console — console.anthropic.com)

1. **Create two Workspaces:** `bro-startit-dev` and `bro-startit-prod`. Keep them fully separate — separate rate-limit pools, separate budgets.
2. **Issue one API key per Workspace.** Never share a key across dev and prod.
3. **Set a hard spend limit on each Workspace.** Start conservative (e.g. a few dollars/day on dev while testing) and raise prod's cap deliberately as real usage data comes in — don't leave either uncapped.
4. **Set budget alert thresholds** (e.g. 50%/80%/100% of the cap) so you get a warning before a runaway loop or a leaked key burns the whole budget silently.
5. **Store the two keys in the secrets manager once it exists** (see the companion runbook) — `ANTHROPIC_API_KEY_DEV` and `ANTHROPIC_API_KEY_PROD`, matching `.env.example`.
6. **Never let the prod key touch a local dev machine.** Dev work only ever uses the dev key and dev Workspace.

## Status
- [ ] Dev Workspace created
- [ ] Prod Workspace created
- [ ] Dev key issued + spend cap set
- [ ] Prod key issued + spend cap set
- [ ] Budget alerts configured on both
