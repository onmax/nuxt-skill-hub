## Verification and Finish

### Rule ID: `verify-check-the-intended-surface`
### Rule: Verify the intended framework surface, not only the visible result
### When to apply
Before concluding a Nuxt change.

### Wrong pattern
Stopping once the UI looks correct or once one failing line was changed.

### Recommended pattern
Confirm that the final implementation uses the intended Nuxt, Nuxt Content, or Nuxt UI surface.

### Nuxt-specific caveat
Framework tasks often fail because the behavior is visibly fixed but implemented through the wrong abstraction.

### Execution checklist
- Inputs to inspect: the final primitive, composable, or component choice.
- Minimal verification: the solution matches the framework-owned abstraction expected by the task.
- Stop condition: the prompt explicitly asks for a framework-agnostic implementation.

### Rule ID: `verify-second-surface-before-finish`
### Rule: Check for a second required surface before finishing
### When to apply
Tasks involving errors, layout plus page behavior, or server/client boundaries.

### Wrong pattern
Editing the first obvious file and concluding the work without checking paired surfaces.

### Recommended pattern
Ask whether the change also needs a global/local or server/client counterpart, then verify both surfaces explicitly.

### Nuxt-specific caveat
Nuxt patterns often span more than one file or render surface, especially around errors and privileged data flow.

### Execution checklist
- Inputs to inspect: related files such as `app/error.vue`, local boundaries, server routes, client callers, layouts, and pages.
- Minimal verification: both required surfaces are updated or explicitly ruled out.
- Stop condition: the task is intentionally isolated to one surface.

### Rule ID: `verify-version-sensitive-api-shapes`
### Rule: Re-check version-sensitive API shapes before finalizing
### When to apply
Using components or module APIs that have plausible older alternatives.

### Wrong pattern
Trusting approximate memory for component props, slot names, or composable signatures.

### Recommended pattern
Re-check the installed skill or linked docs when an API shape looks close but uncertain.

### Nuxt-specific caveat
Version drift often shows up as “almost right” component or module usage that passes casual review but is wrong for the installed version.

### Execution checklist
- Inputs to inspect: wrapper links, installed skill guidance, and exact component or composable signature.
- Minimal verification: current API names and state models match the installed version.
- Stop condition: the local project intentionally wraps the upstream API with a different contract.
