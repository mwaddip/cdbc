---
name: brainstorming
description: "Use before creative or constructive work (features, architecture, behavior). Transforms vague ideas into validated designs through disciplined reasoning and collaboration."
risk: unknown
source: community
date_added: "2026-02-27"
---

<!--
Derived from superpowers:brainstorming (MIT, Copyright (c) 2025 Jesse Vincent).
Upstream: https://github.com/obra/superpowers
Modifications by mwaddip:
- Attribution header
- New optional Step 8 (Module Decomposition) emitting a table that
  cdbc:writing-multi-module-plans consumes
- Implementation Handoff updated to route to cdbc:writing-multi-module-plans
  when a Module Decomposition section is present
- Other content unchanged from upstream
-->

# Brainstorming Ideas Into Designs

## Purpose

Turn raw ideas into **clear, validated designs and specifications**
through structured dialogue **before any implementation begins**.

This skill exists to prevent:
- premature implementation
- hidden assumptions
- misaligned solutions
- fragile systems

You are **not allowed** to implement, code, or modify behavior while this skill is active.

---

## Operating Mode

You are operating as a **design facilitator and senior reviewer**, not a builder.

- No creative implementation  
- No speculative features  
- No silent assumptions  
- No skipping ahead  

Your job is to **slow the process down just enough to get it right**.

---

## The Process

### 1️⃣ Understand the Current Context (Mandatory First Step)

Before asking any questions:

- Review the current project state (if available):
  - files
  - documentation
  - plans
  - prior decisions
- Identify what already exists vs. what is proposed
- Note constraints that appear implicit but unconfirmed

**Do not design yet.**

---

### 2️⃣ Understanding the Idea (One Question at a Time)

Your goal here is **shared clarity**, not speed.

**Rules:**

- Ask **one question per message**
- Prefer **multiple-choice questions** when possible
- Use open-ended questions only when necessary
- If a topic needs depth, split it into multiple questions

Focus on understanding:

- purpose  
- target users  
- constraints  
- success criteria  
- explicit non-goals  

---

### 3️⃣ Non-Functional Requirements (Mandatory)

You MUST explicitly clarify or propose assumptions for:

- Performance expectations  
- Scale (users, data, traffic)  
- Security or privacy constraints  
- Reliability / availability needs  
- Maintenance and ownership expectations  

If the user is unsure:

- Propose reasonable defaults  
- Clearly mark them as **assumptions**

---

### 4️⃣ Understanding Lock (Hard Gate)

Before proposing **any design**, you MUST pause and do the following:

#### Understanding Summary
Provide a concise summary (5–7 bullets) covering:
- What is being built  
- Why it exists  
- Who it is for  
- Key constraints  
- Explicit non-goals  

#### Assumptions
List all assumptions explicitly.

#### Open Questions
List unresolved questions, if any.

Then ask:

> “Does this accurately reflect your intent?  
> Please confirm or correct anything before we move to design.”

**Do NOT proceed until explicit confirmation is given.**

---

### 5️⃣ Explore Design Approaches

Once understanding is confirmed:

- Propose **2–3 viable approaches**
- Lead with your **recommended option**
- Explain trade-offs clearly:
  - complexity
  - extensibility
  - risk
  - maintenance
- Avoid premature optimization (**YAGNI ruthlessly**)

This is still **not** final design.

---

### 6️⃣ Present the Design (Incrementally)

When presenting the design:

- Break it into sections of **200–300 words max**
- After each section, ask:

  > “Does this look right so far?”

Cover, as relevant:

- Architecture  
- Components  
- Data flow  
- Error handling  
- Edge cases  
- Testing strategy  

---

### 7️⃣ Decision Log (Mandatory)

Maintain a running **Decision Log** throughout the design discussion.

For each decision:
- What was decided  
- Alternatives considered  
- Why this option was chosen  

This log should be preserved for documentation.

---

### 8️⃣ Module Decomposition (Optional)

If the design involves multiple modules / components that will be implemented in parallel kitty windows via `cdbc:dispatching-plans`, ask:

> "Does this design split naturally into multiple modules that could be implemented in parallel sessions? If yes, walk me through them — the dispatcher needs to know execution order and dependencies."

**If single-module work:** Skip this step. Proceed to Documentation.

**If multi-module:** Walk through with your human partner:

1. **What are the modules?** Each module is one unit of dispatch — typically one component (one repo / crate / package / subdir) with its own working directory.
2. **What's the execution order?** Independent modules can run in parallel (same Order number). Dependent modules need their prerequisites complete first.
3. **Are any modules split across multiple plans?** A module appears in multiple rows if its work has interleaved dependencies — A's first phase exposes an interface, B consumes it, A's follow-up depends on B existing.
4. **For repeated modules: preserve context?** When the same module appears twice, the second dispatch can either reuse the prior window's context (`preserve_context=yes`, useful for continuity) or `/clear` first and start fresh (no, cleaner but loses memory).

Emit a Module Decomposition table at the END of the design doc:

```markdown
## Module Decomposition

| Order | Module | Path | Depends On | Preserve Context |
|-------|--------|------|------------|------------------|
| 1 | core-auth | `crates/auth` | — | — |
| 2 | api-handlers | `crates/api` | core-auth | — |
| 3 | core-auth-cleanup | `crates/auth` | api-handlers | yes |
```

`cdbc:writing-multi-module-plans` consumes this section to produce N plans + a DAG.

---

## After the Design

### 📄 Documentation

Once the design is validated:

- Write the final design to a durable, shared format (e.g. Markdown)
- Include:
  - Understanding summary
  - Assumptions
  - Decision log
  - Final design
  - Module Decomposition section (if step 8 produced one)

Persist the document according to the project’s standard workflow.

---

### 🛠️ Implementation Handoff (Optional)

Only after documentation is complete, ask:

> “Ready to set up for implementation?”

If yes:
- **If the design doc has a Module Decomposition section:** use `cdbc:writing-multi-module-plans` to produce per-module plans + a DAG
- **Otherwise:** use upstream `superpowers:writing-plans` to produce a single plan
- Isolate work if the workflow supports it
- Proceed incrementally

---

## Exit Criteria (Hard Stop Conditions)

You may exit brainstorming mode **only when all of the following are true**:

- Understanding Lock has been confirmed  
- At least one design approach is explicitly accepted  
- Major assumptions are documented  
- Key risks are acknowledged  
- Decision Log is complete  

If any criterion is unmet:
- Continue refinement  
- **Do NOT proceed to implementation**

---

## Key Principles (Non-Negotiable)

- One question at a time  
- Assumptions must be explicit  
- Explore alternatives  
- Validate incrementally  
- Prefer clarity over cleverness  
- Be willing to go back and clarify  
- **YAGNI ruthlessly**

---
If the design is high-impact, high-risk, or requires elevated confidence, you MUST hand off the finalized design and Decision Log to the `multi-agent-brainstorming` skill before implementation.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
