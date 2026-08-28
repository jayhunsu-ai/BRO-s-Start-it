# ADR 0001: Hosting and Container Strategy

## Status
Accepted — 2026-08-28

## Context
BRO / Start-It / Veltrix is being rebuilt as a unified platform serving a companion AI (BRO), a founder/CEO dashboard, a team workspace, and a citizen dashboard, with an initial target of ~5,000 users. We need a hosting and containerization approach that is affordable pre-revenue, portable if we outgrow the initial platform, and doesn't lock us into infrastructure we don't yet need.

Options considered:
- Buy owned hardware (e.g. NVIDIA DGX Stations) for AI inference now
- Self-host inference on a peer GPU marketplace (e.g. vast.ai)
- Stay on managed cloud platforms (Render/Railway) with cloud AI APIs, containerizing for portability

## Decision
- Stay on **Render/Railway** for hosting rather than buying hardware or self-hosting inference now.
- **Every service is containerized** with its own Dockerfile from day one — this is the actual "built for scale" decision, since it keeps us portable off Render/Railway later without a rewrite.
- **Kubernetes is explicitly deferred** until there is a real scaling trigger — not adopted preemptively.
- Inference stays on **cloud AI APIs** (Claude) rather than self-hosted models. vast.ai and similar peer GPU marketplaces were considered and rejected on security-posture grounds (unvetted peer infrastructure is a worse fit for handling contract/companion data than a vendor API with proper key handling).
- DGX hardware purchase is **rejected for now**, not permanently. Cloud APIs plus containerized services is the path while pre-revenue.

## Consequences
- Lower upfront cost; no capex risk before there's usage data to justify it.
- Every service needs a Dockerfile maintained from the start, which is a small ongoing tax but keeps migration cheap later.
- We're dependent on Render/Railway's platform limits until/unless we migrate — acceptable given containerization keeps that migration a Docker-image swap rather than a rebuild.
- We're dependent on Claude API pricing/availability for inference; mitigated by model routing, prompt caching, and per-user quotas (tracked separately).

## Revisit Trigger
Revisit this decision only when we have **sustained inference cost data** showing owned hardware would be cheaper at real usage volume, or a **NDPR data-residency requirement** forces a change — not on raw capex-savings speculation alone.
