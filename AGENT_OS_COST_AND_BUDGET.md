# Start-It / BRO / Veltrix — Cost, Budget & Spend-Control Policy

**Status:** Hard-control specification v1.0

## 1. Purpose

Protect the user's finite AI budget while preserving engineering quality.

The cost controller is outside model authority. Agents cannot modify its hard limits.

## 2. Budget hierarchy

```
GLOBAL MONTHLY HARD CEILING
        |
PROJECT BUDGET
        |
DAY BUDGET
        |
TASK BUDGET
        |
INVOCATION BUDGET
        |
RETRY / CHILD-WORKER BUDGET
```

A lower-level limit may be tighter but never looser.

## 3. $500 operating policy

The initial monthly ceiling is **$500**.

Recommended operational guardrails:
- target normal day: $15–25;
- warning zone: $25+;
- investigation threshold: $35;
- default daily hard stop: $50;
- monthly reserve: at least 10% where practical.

These are controls, not promises of consumption.

The system must not assume the full $500 is available merely because it exists.

## 4. Budget reservation

Before a paid model call:
1. estimate uncached input;
2. estimate cached input;
3. estimate output;
4. include provider/model pricing version;
5. reserve the maximum permitted cost;
6. execute only if reservation is allowed;
7. reconcile reservation against actual usage.

A failed request still consumes provider cost when billed and must be recorded.

## 5. Cache economics

Context should be structured for stable prefixes.

Track separately:
- uncached input tokens;
- cached input tokens;
- cache writes where applicable;
- output tokens.

Cacheable content:
- system contracts;
- role instructions;
- stable project architecture;
- stable coding conventions;
- verified memory.

Fresh content:
- task;
- changed files;
- current test output;
- tool results;
- volatile state.

Never place secrets into reusable model context.

## 6. Hard limits

Every invocation must have:
- max spend;
- max output tokens;
- max retries;
- max tool calls;
- max child workers;
- timeout.

A hard limit produces `DENY` or `ESCALATE`, never silent retry.

## 7. Circuit breakers

Trigger a global or project circuit breaker on:
- unexplained spend spike;
- repeated identical calls;
- runaway retries;
- cache failure causing repeated full-context calls;
- concurrent worker explosion;
- provider error loop;
- budget accounting inconsistency.

Circuit-breaker states:

`GREEN -> WARNING -> HALTED`

Only authorized control logic or human approval can resume HALTED execution.

## 8. Escalation budgets

Reserve expensive models for justified cases:
- Fable: architecture escalation;
- Astra: security authority;
- Opus: command/difficult engineering;
- Sonnet: normal implementation;
- lower-cost models: classification/discovery/distillation/mechanical work.

An escalation request must state:
- why current model is insufficient;
- expected quality benefit;
- estimated cost;
- alternatives attempted;
- whether verification requires it.

## 9. Retry policy

Default:
- attempt 1;
- evidence-based retry;
- attempt 2;
- escalate or stop.

A third attempt requires explicit policy authorization.

Never retry an identical failing request with no diagnostic change.

## 10. Spend ledger

Record:
- timestamp;
- project;
- task;
- invocation;
- provider;
- model;
- pricing version;
- estimated cost;
- actual cost;
- cache hit/read/write metrics where available;
- result;
- retry count;
- escalation reason.

Never record API secrets.

## 11. Cost-quality metric

Primary metric:

**cost per independently verified successful task**

Secondary:
- cost per accepted change;
- rework cost;
- escaped-defect cost;
- latency;
- cache hit rate;
- escalation rate.

Do not optimize token count at the expense of verification.

## 12. Dry-run requirement

Before real provider credentials are enabled, the cost controller must support a simulated provider mode that:
- estimates usage;
- applies budgets;
- exercises retries;
- exercises circuit breakers;
- produces the same ledger schema;
- makes zero paid API calls.

## 13. Emergency shutdown

A single control must be able to set:

`AI_EXECUTION_ENABLED=false`

The orchestrator must honor it before any new provider call.

## 14. Acceptance tests

The implementation must prove:
- a task over its ceiling is denied;
- a daily hard stop prevents new paid calls;
- retry limits work;
- a fake spend spike trips the circuit breaker;
- cache-miss cost can block execution;
- an agent cannot alter budgets;
- provider failures cannot create infinite retry;
- dry-run mode incurs zero provider spend.
