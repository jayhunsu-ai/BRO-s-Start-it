# Start-It / BRO / Veltrix — Agent OS Dry-Run & Failure Simulation

**Status:** Required before real provider rollout v1.0

## 1. Purpose

Exercise the full Agent OS without making paid model calls or destructive external actions.

## 2. Simulation boundary

Replace providers with deterministic mock responses and simulated token/cost data.

The same:
- task envelopes;
- policies;
- budgets;
- routing;
- context assembly;
- retry rules;
- verification;
- traces;
- state transitions

must execute.

## 3. Required scenarios

### Budget
- task exceeds budget;
- daily hard stop;
- monthly ceiling;
- cache miss makes task unaffordable;
- agent attempts to increase its own budget.

### Failure
- timeout;
- malformed model output;
- tool failure;
- repeated identical failure;
- verifier rejection;
- security block.

### Concurrency
- too many workers;
- conflicting edits;
- dependent task starts early;
- worker cancellation.

### Security
- cross-project access;
- unauthorized production write;
- prompt injection in repository text;
- secret-like tool output;
- invalid tool arguments.

### Network
- Blocks unavailable;
- provider unavailable;
- partial result;
- duplicate message;
- delayed message.

### Recovery
- process restart;
- lost worker;
- stale task;
- resumed task after verified checkpoint.

## 4. Expected safety behavior

No scenario may:
- bypass policy;
- exceed budget;
- leak secrets;
- bypass verification;
- create unauthorized production actions;
- create an infinite retry loop.

## 5. Cost simulation

Each mock invocation returns:
- input tokens;
- cached input tokens;
- output tokens;
- simulated cost;
- latency.

The spend ledger must behave exactly as it would with real providers.

## 6. Exit criteria

Real provider credentials may be enabled only when:
- all mandatory scenarios pass;
- hard budget controls pass;
- security controls pass;
- project isolation passes;
- recovery tests pass;
- traces are generated correctly;
- the emergency shutdown works.
