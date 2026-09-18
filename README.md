# AgentLens Review Kit

A small TypeScript example of a review lifecycle: **proposal → human decision → execution receipt → evaluation**. A submitted proposal is not permission, and an executed change is not automatically a successful outcome.

Adapted by Lei Qian from the lifecycle concepts in a private AgentLens workbench. This independent module uses a reduced contract and additional input checks; it is not the complete workbench.

## Run locally

Requires Node.js 24. No runtime dependencies or installation step.

```sh
npm test
npm run example
node scripts/export-scenarios.mjs scenarios.json
```

The four deterministic examples demonstrate an approved trial, rejected execution, execution failure and insufficient evidence. The rejection example actually calls the execution function and captures its refusal. All inputs are synthetic. They do not run a model, contact a service or measure model quality.

## API

Import from `./src/index.ts`: `createProposal`, `createReviewDecision`, `createExecutionReceipt`, `createEvaluationResult`, `hashRecord`, `verifyRecord`. See `examples/scenarios.mjs` for complete working calls.

Each created record is immutable, has an explicit UTC timestamp, and includes a SHA-256 content digest. Downstream records retain the parent identifier and digest. Supply timestamps rather than relying on an implicit clock to make example runs reproducible.

The input boundary checks the parent kind and digest, enum values, date validity, candidate references and boolean evaluation signals. A rejection or deferral cannot create an execution receipt. Failed, partial and no-op executions cannot be confirmed. Regression takes precedence; incomplete evidence remains inconclusive.

## Design decisions

- Separate objects preserve what was proposed, decided, performed and evaluated instead of rewriting one mutable status field.
- A bounded trial authorization is distinct from a positive evaluation.
- Evaluation signals are caller-supplied assertions. The module checks their shape and applies a rule; it does not collect evidence or establish statistical sufficiency.
- Node's built-in cryptography and test runner keep this example independently runnable.

## Boundaries

The `local_user` role field is **not authentication or authorization enforcement**. A digest is **not a digital signature**: a malicious party can modify a record and compute a new hash. This module does not persist records, arbitrate competing decisions, prevent cross-process replay or provide distributed transactions. Integrators must supply identity, access control, durable storage, evidence collection and concurrency handling.

The website replay is generated from this module's example output. It is not a live AgentLens service. Native TypeScript execution on Node 24 does not replace a compiler check for a larger integration.

MIT licensed. No third-party source is bundled. [中文说明](README.zh-CN.md).
