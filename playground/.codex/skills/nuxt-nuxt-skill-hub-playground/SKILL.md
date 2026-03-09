---
name: "nuxt-nuxt-skill-hub-playground"
description: "Nuxt super-skill for this project. Use as the entry point for Nuxt best practices plus installed module skill extensions."
---

# Nuxt Super Skill

This skill is the primary entrypoint for Nuxt work in this repository.

## Structure
- [references/index.md](./references/index.md): navigation map for all available guidance.
- [references/core/index.md](./references/core/index.md): core Nuxt best-practice packs that apply by default.
- [references/modules](./references/modules): module-specific guides discovered from installed Nuxt modules.

## Workflow
1. Open [references/index.md](./references/index.md).
2. Start with core guidance unless the task is fully module-specific.
3. If the task involves an installed module, load the matching guide under [references/modules](./references/modules).
4. Apply only the smallest relevant sections to keep changes focused.

## Precedence
Core guidance is default. Module guidance overrides core only inside the module's explicit scope.
