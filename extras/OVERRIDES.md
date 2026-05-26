# Agent Directives: Mechanical Overrides (example, sanitized)

> Copy this file to your projects root (e.g., `~/projects/OVERRIDES.md`) and
> reference it from your global `~/.claude/CLAUDE.md` (see `extras/CLAUDE.md`
> for an example). Sections I–III below are universally applicable; Section IV
> is a placeholder for your project's high-stakes domain rules.

You are operating within a constrained context window. To produce production-grade
code, you MUST adhere to these mechanical overrides. They apply to all projects
unless explicitly labeled domain-specific.

---

## I. Pre-Work

### 1. DEAD CODE FIRST (The "Step 0" Rule)

Dead code accelerates context compaction and causes stale-reference confusion.
Before ANY structural refactor on a file >200 LOC, first:
1. Remove all dead props, unused exports, unused imports, and debug logs
2. Remove all commented-out code blocks
3. Do this as a separate edit pass before starting the real work

This cleanup must be a distinct step — not mixed into the structural changes.

### 2. PHASED EXECUTION

Never attempt multi-file refactors in a single response. Break work into
explicit phases:
- Each phase touches **no more than 5 files**
- Complete Phase N, run verification (see Rule 4), and wait for explicit user
  approval before Phase N+1
- Each phase should be independently verifiable

Parallel sub-agents are acceptable ONLY for truly independent files (e.g.,
separate UI components with no shared state). They are **forbidden** for
interdependent protocol files where a hash or address change in one file
cascades to others.

---

## II. Code Quality

### 3. ROOT-CAUSE MANDATE

NEVER apply a lazy fix, band-aid, workaround, or symptom-level patch. Every
bug has a structural root cause. Your job is to find it and fix it THERE.

**If you catch yourself writing any of these, STOP:**
- A `setTimeout` to "wait for something to be ready" → fix the ordering
- A `try/catch` that swallows errors → fix the producer
- A retry loop around flaky code → fix WHY it's flaky
- A flag variable to skip broken logic → fix the logic
- A `window.__flag` hack or global state override → fix the architecture
- A `.filter()` to remove "bad" data → fix why bad data exists

**Ask yourself:** "Why is the wrong thing happening in the first place?" Fix
*that*. A workaround today is a bug tomorrow. This overrides speed pressure.

**If 3+ attempted fixes fail:** Stop fixing symptoms. The architecture is
wrong. Discuss with the user before attempting more fixes.

### 4. FORCED VERIFICATION

Your tools mark file writes as successful even if the code does not compile.
You are FORBIDDEN from reporting a task as complete until you have run the
appropriate verification:

| Component | Command | Notes |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Must pass with zero errors |
| Next.js Frontend | `npm run build` | Catches both TS and JSX errors |
| ESLint (if configured) | `npx eslint . --quiet` | Must pass with zero errors |
| Python | `pytest tests/ -v --tb=short` | Run the FULL test suite |

Extend this table for your stack (cargo, go test, mvn verify, etc.). Fix ALL
resulting errors before reporting success. If no type-checker is configured
for a component, state that explicitly instead of claiming success.

---

## III. Edit Safety & Context Management

### 5. CONTEXT DECAY AWARENESS

After **10+ messages** in a conversation, you MUST re-read any file before
editing it. Do not trust your memory of file contents. Auto-compaction may have
silently destroyed that context and you will edit against stale state.

**Heuristics for when you're in the decay zone:**
- You've been working for 30+ minutes in the same conversation
- You've done 60+ tool calls
- You've edited the same file more than twice
- You're about to edit a file you read more than 10 messages ago

When in doubt, re-read. It costs seconds. Editing against stale state costs hours.

### 6. EDIT INTEGRITY

Before EVERY file edit:
1. Re-read the target file (or at minimum the target section)
2. Make the edit
3. Read the file again to confirm the change applied correctly

The edit tool fails **silently** when `old_string` doesn't match due to stale
context. Never batch more than **3 edits** to the same file without a
verification read between batches.

### 7. EXHAUSTIVE RENAME SEARCH

You have grep, not an AST. When renaming or changing any function, type,
variable, hash, or address, you MUST search separately for:

**Code references:**
- Direct calls and references
- Type-level references (interfaces, generics)
- String literals containing the name
- Dynamic imports and `require()` calls
- Re-exports and barrel file entries
- Test files and mocks

### 8. TRUNCATION SUSPICION

Tool results over a certain size are silently truncated. If any search or
command returns suspiciously few results:
1. Re-run with narrower scope (single directory, stricter glob)
2. State explicitly that you suspect truncation occurred
3. Break large searches into targeted sub-searches

If a search returns exactly the result cap (e.g., 50 matches), there are
almost certainly more results that were cut off.

---

## IV. Domain-Specific (template — fill in for your project)

Add rules specific to your project's high-stakes areas. The author's full
version has a "Blockchain Systems" section covering ErgoScript immutability,
on-chain time = block height, AMM adversarial pricing, CBOR chunking quirks,
etc. — replaced here with a generic template so you can add what matters for
your domain.

Categories that have benefited from a dedicated section:

- **Smart contracts / on-chain code** — immutability awareness, verification thresholds, blast-radius mapping before any change
- **Security-critical code** — cryptographic review, secret handling, auth flow correctness
- **Financial systems** — calculation accuracy, audit trails, precision/rounding, idempotency
- **ML / AI deployments** — data validation, model versioning, drift detection
- **Hardware interfaces** — timing constraints, protocol specifics, recovery paths

For each rule:

1. **Name the failure mode** it prevents (e.g., "deployed contracts cannot be patched, so a bug = permanent loss")
2. **Specify the exact behavior required** (e.g., "before modifying any contract, grep for every file referencing its hash and trace the full spending path")
3. **Include domain-specific examples** so the rule can't be misread as a vague principle

Delete this section if your project doesn't have a high-stakes domain that
warrants codified guardrails beyond the universal sections above.

---

## Quick Reference

| # | Rule | One-Liner |
|---|---|---|
| 1 | Dead Code First | Clean before refactoring, always |
| 2 | Phased Execution | Max 5 files per phase, verify between phases |
| 3 | Root-Cause Mandate | No band-aids. Fix the origin, not the symptom. |
| 4 | Forced Verification | Run tsc/build/pytest. Fix all errors. Then claim done. |
| 5 | Context Decay | 10+ messages → re-read before editing |
| 6 | Edit Integrity | Read → edit → read. Max 3 edits between verification reads. |
| 7 | Rename Search | Grep code, types, strings, imports, tests, configs, docs |
| 8 | Truncation | Suspiciously few results → re-run narrower, state the suspicion |
| 9+ | Domain-Specific | Your additions go here |
