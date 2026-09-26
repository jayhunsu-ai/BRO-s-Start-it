# Start-It / BRO / Veltrix — Context & Cache Architecture

**Status:** Cost/quality optimization specification v1.0

## 1. Goal

Give every model the smallest context that is sufficient for a correct decision while maximizing stable-prefix cache reuse.

## 2. Context layers

```
L0 GLOBAL CONTRACT
L1 PROJECT CONSTITUTION
L2 REPOSITORY SNAPSHOT
L3 VERIFIED MEMORY
L4 TASK
L5 TARGET CODE
L6 LIVE TOOL RESULTS
```

L0-L3 are candidates for stable cached prefixes.

L4-L6 are normally fresh.

## 3. Context assembly

```
task
 -> project authorization
 -> repository/ref
 -> CodeGraph query
 -> verified memory retrieval
 -> relevant files/symbols
 -> tests/config
 -> compact context package
 -> model
```

Never attach the entire repository by default.

## 4. Cache policy

Stable prefixes should remain byte/token stable where provider caching requires prefix stability.

Do not append volatile data before stable content.

Track:
- cache hit;
- cache miss;
- cached input tokens;
- uncached input tokens;
- cache writes;
- context size;
- task result.

## 5. Context minimization

Prefer:
- symbol summaries;
- exact relevant files;
- targeted snippets;
- CodeGraph relationships;
- test failures;
- verified memory.

Avoid:
- unrelated files;
- entire histories;
- duplicate instructions;
- stale task dumps;
- repeated repository summaries.

## 6. Freshness

Every repository-derived context item carries:
- repository;
- ref/commit;
- source path/symbol;
- evidence state;
- timestamp.

Stale structural context must be refreshed before consequential changes.

## 7. Memory retrieval

Alfred memory is advisory until provenance/verification is checked.

Priority:
1. verified current project facts;
2. verified repository conventions;
3. verified historical patterns;
4. recent relevant traces;
5. inferred knowledge, clearly marked.

## 8. Security

Never cache:
- API keys;
- access tokens;
- passwords;
- session cookies;
- private credentials;
- sensitive personal data unless explicitly required and authorized.

Redact before persistence.

## 9. Cache failure policy

If expected cached content becomes uncached:
1. recalculate cost;
2. compare against task ceiling;
3. proceed only if allowed;
4. otherwise reduce context or escalate;
5. never blindly resend full context.

## 10. Context contract

Every model invocation should be explainable as:

`why this context + why this model + why this budget`

The trace records the decision summary, not private reasoning.

## 11. Acceptance tests

Prove:
- stable context produces cache reuse where provider supports it;
- unrelated repository content is excluded;
- stale context is detected;
- cache miss triggers cost recalculation;
- secret material cannot enter persistent cache/memory.
