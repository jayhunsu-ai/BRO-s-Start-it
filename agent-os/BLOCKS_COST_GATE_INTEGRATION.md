# Agent OS ↔ Blocks Financial Airlock

Phase 1 establishes the execution boundary without introducing a dependency between the two repositories.

## Runtime contract

1. Agent OS estimates and reserves the maximum permitted provider spend.
2. Agent OS passes the reservation id to Blocks as:
   `AGENT_OS_COST_RESERVATION_ID`
3. Agent OS also passes optional identity metadata:
   - `AGENT_OS_PROJECT_ID`
   - `AGENT_OS_TASK_ID`
4. Blocks' Claude driver calls its installed cost gate immediately before `spawn()`.
5. A missing/invalid reservation prevents the provider process from starting.
6. When the provider turn ends, Blocks reports the provider-reported cost back to the gate.
7. If usage is unknown, the adapter reconciles the full reserved maximum instead of treating unknown spend as zero.
8. The existing Blocks ask-broker remains the human/tool permission mechanism; the financial gate is separate.

## Host wiring

The host that owns both Agent OS and Blocks should:

- create one `CostController`;
- create `createBlocksCostGate(costController)`;
- pass/install that object into Blocks through `installProviderCostGate(...)`;
- create a reservation before starting a paid provider turn;
- include the reservation id in the turn's `env`.

Do not let Blocks create its own budget or pricing authority.

## Current safety state

The Blocks gate defaults to **fail closed**. Until the host installs a gate and supplies a reservation, Claude cannot spawn.

The Phase 1 Agent OS controller still uses simulated pricing. This integration therefore proves the control boundary only; it does **not** authorize real paid rollout yet.
