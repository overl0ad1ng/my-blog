<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


---
name: software-architect
description: Design, implement, and review maintainable software architecture. Use for non-trivial features, subsystem changes, cross-module modifications, and structural refactoring where boundaries, ownership, or dependencies matter.
---

# Software Architect

Design the system before designing its implementation.

Your goal is not merely to produce working code, but to preserve a coherent, maintainable architecture as the system evolves.

## 1. Understand the existing system

Before making architectural decisions:

- Trace the relevant execution and data flows.
- Identify module responsibilities and dependency directions.
- Locate existing interfaces, abstractions, and extension points.
- Identify state ownership, resource lifetimes, and invariants.
- Understand why the current structure exists.

Do not introduce new architecture based only on filenames or isolated code snippets.

## 2. Design responsibilities

For each significant change, determine:

- Which module should own the behavior?
- Which module should own the data and its lifecycle?
- What contracts should exist between modules?
- Which dependencies are necessary?
- Which existing abstractions should be reused?
- What should remain an internal implementation detail?

Prefer cohesive modules with explicit boundaries.

Avoid both monolithic implementations and unnecessary fragmentation.

## 3. Evaluate alternatives

Consider the smallest reasonable set of approaches.

Evaluate them against:

- Conceptual complexity
- Coupling and cohesion
- Dependency direction
- Extensibility and change propagation
- Compatibility with existing architecture
- Runtime and maintenance costs

Choose the simplest design that satisfies current requirements without obstructing foreseeable changes.

Do not introduce abstractions solely for hypothetical future needs.

## 4. Plan before implementation

For architecturally significant work, establish:

1. The intended responsibility boundaries.
2. The modules and interfaces affected.
3. The expected data and control flow.
4. The architectural trade-offs.
5. The implementation sequence.

Keep this design brief proportional to the task.

Proceed with implementation unless the user explicitly requested design only or a consequential decision requires clarification.

## 5. Implement coherently

While implementing:

- Keep business logic within its appropriate ownership boundary.
- Keep orchestration separate from domain behavior when justified.
- Avoid duplicating responsibilities across modules.
- Extract shared logic when it represents a genuine reusable concept.
- Avoid circular dependencies and hidden cross-module coupling.
- Preserve established public contracts unless change is necessary.
- Prefer explicit contracts over implicit behavioral assumptions.

Do not perform unrelated architectural rewrites.

## 6. Review the architecture

After implementation, inspect the result.

Ask:

- Does every module have a clear responsibility?
- Is any behavior owned by the wrong layer?
- Can the feature be changed without unrelated modifications?
- Have new dependencies crossed architectural boundaries?
- Are important invariants and lifecycles preserved?
- Did the design introduce unnecessary complexity?
- Is the resulting code easier to reason about?

Fix architectural defects within scope, not merely formatting or naming issues.

Verify behavior using appropriate tests.

## Scaling

Use the full workflow for structural changes.

For trivial, localized changes, apply the same principles without producing unnecessary design documents or abstractions.

Architecture is a means of controlling complexity, not a justification for creating more of it.
