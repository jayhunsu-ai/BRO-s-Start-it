# Start-It / BRO / Veltrix — Execution Specification

**Status:** Implementation contract v1.0

## 1. Canonical task lifecycle

```
INGEST
 -> NORMALIZE
 -> CLASSIFY
 -> AUTHORIZE
 -> BUDGET
 -> DISCOVER
 -> PLAN
 -> CONTEXT
 -> ROUTE
 -> EXECUTE
 -> TEST
 -> SECURITY_GATE
 -> VERIFY
 -> COMMIT
 -> UPDATE_ASANA
 -> TRACE
 -> DISTILL
 -> COMPLETE
```

Stages may be skipped only when policy says they are unnecessary.

## 2. Ingest

Accept a human request, Asana task, issue, CI failure, or scheduled maintenance event.

Normalize into a task envelope.

## 3. Authorize

Determine project, repository, environment, actor, allowed tools, scope, security class, and required approvals.

## 4. Budget

Reserve task and invocation budget before paid calls.

If reservation fails, stop.

## 5. Discover

Use CodeGraph first for structural questions, then targeted source/config/test inspection.

Record repository ref/commit.

## 6. Plan

Chief of Staff produces:
- objective;
- dependency order;
- assignments;
- acceptance criteria;
- evidence requirements;
- risk/escalation conditions;
- cost estimate.

## 7. Route

Select role, model, skills, tools, and worker count according to policy.

## 8. Execute

Workers operate within bounded scope.

All tool calls pass through the Tool Gateway.

## 9. Test

Run the smallest sufficient tests, then broader tests according to risk.

## 10. Security gate

Required for security-sensitive changes. Astra or the authorized security path can block.

## 11. Verify

Independent verifier returns exactly:
- APPROVE
- CHANGES REQUIRED
- REJECT

## 12. Remediation

CHANGES REQUIRED returns to the smallest responsible implementation owner with the verifier evidence.

Retry budgets still apply.

## 13. Commit/release

Only approved work may enter the merge/release path.

Production operations remain separately authorized.

## 14. Trace

Persist structured evidence:
- task;
- actor;
- model;
- repository/ref;
- context sources;
- actions;
- tests;
- review;
- verifier;
- cost;
- outcome.

## 15. Alfred distillation

Distill only validated lessons. Attach provenance.

## 16. Completion

Task is complete only when:
- acceptance criteria pass;
- tests/evidence pass;
- required security gate passes;
- independent verification passes;
- trace exists;
- state is updated.

## 17. Idempotency

Orchestration commands should carry a task/invocation idempotency key.

Repeated orchestration events must not duplicate:
- payments;
- deployments;
- migrations;
- PR creation;
- destructive actions.

## 18. Recovery

Persist enough state to resume after:
- model timeout;
- provider failure;
- tool failure;
- process restart;
- network interruption.

Resume from the last verified state, not from an assumed state.
