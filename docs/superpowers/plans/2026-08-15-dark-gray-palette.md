# Единая серо-тёмная палитра Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить случайные белые и светлые поверхности в тёмной теме по всему приложению.

**Architecture:** Существующие CSS-токены остаются единственным источником нейтральных цветов. Тёмная тема задаёт значения токенов на `html[data-theme="dark"]`, а специфичные компоненты получают точечные dark-theme переопределения только там, где сейчас зашиты светлые цвета. Семантические status-цвета не превращаются в нейтральные.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, plain CSS imports, pnpm, ESLint, Vitest.

## Global Constraints

- Не менять существующую светлую тему.
- Не удалять и не переписывать чужие незакоммиченные изменения.
- Не добавлять зависимости.
- Не менять бизнес-логику, тексты и поведение переключателя темы.
- Сохранять оранжевый как accent, а зелёный/красный/жёлтый — как семантические статусы.

### Task 1: Normalize shared dark surfaces

**Files:**
- Modify: `src/app/styles/theme.css`
- Modify: `src/app/styles/base.css`

**Interfaces:**
- Consumes: existing `--ink`, `--muted`, `--paper`, `--white`, `--line`, `--accent`, `--green` tokens.
- Produces: complete dark-theme token values and base body/background behavior used by every page.

- [ ] **Step 1: Add/adjust dark neutral tokens**

  Keep the approved values in `html[data-theme="dark"]` and use `var(--paper)`/`var(--white)` for page and surface backgrounds instead of introducing separate one-off neutrals.

- [ ] **Step 2: Remove neutral hard-coded base backgrounds**

  Replace neutral base `#fcfcfb` with `var(--paper)` so the body background follows the active theme while preserving the light-theme token value.

- [ ] **Step 3: Run the CSS-focused lint check**

  Run: `pnpm exec eslint src/app/styles/theme.css src/app/styles/base.css`

  Expected: exit code 0.

### Task 2: Fix storefront, account, commerce and responsive surfaces

**Files:**
- Modify: `src/app/styles/account.css`
- Modify: `src/app/styles/catalog.css`
- Modify: `src/app/styles/commerce.css`
- Modify: `src/app/styles/responsive.css`
- Modify: `src/components/admin-category-form.tsx`

**Interfaces:**
- Consumes: dark tokens from Task 1.
- Produces: dark-compatible profile forms, catalog cards, filter drawers, commerce panels, and form controls.

- [ ] **Step 1: Add dark overrides for hard-coded white neutral surfaces**

  Cover `.profile-form`, catalog cards/filters, commerce panels and mobile filter drawer with `background: var(--white)` (or the approved darker surface where nesting requires contrast) and `color: var(--ink)`.

- [ ] **Step 2: Replace component-level `bg-white` used for neutral forms**

  In `admin-category-form.tsx`, use `bg-[var(--white)]` so the component follows the active theme token.

- [ ] **Step 3: Verify no account screenshot regression remains**

  Run: `rg -n "background: white|background: #fff|bg-white" src/app/styles/account.css src/app/styles/catalog.css src/app/styles/commerce.css src/app/styles/responsive.css src/components/admin-category-form.tsx`

  Expected: no neutral surface remains without either a token or a matching dark override.

### Task 3: Fix admin forms, tables and status surfaces

**Files:**
- Modify: `src/app/styles/admin.css`
- Modify: `src/app/styles/admin-forms.css`

**Interfaces:**
- Consumes: shared dark tokens and existing semantic status selectors.
- Produces: consistent dark admin navigation, cards, tables, inputs, selects, import panels and status badges.

- [ ] **Step 1: Classify hard-coded light colors**

  Keep semantic status colors as-is where they already communicate state; identify neutral white/light backgrounds for cards, inputs, tables and form controls.

- [ ] **Step 2: Add scoped dark-theme overrides for neutral admin surfaces**

  Use selectors rooted at `html[data-theme="dark"]` and the existing component classes. Set surface background to `var(--white)` or `var(--paper)`, text to `var(--ink)`, and borders to `var(--line)`.

- [ ] **Step 3: Keep status contrast readable**

  For status selectors, use darkened tinted backgrounds and their existing semantic text color rather than replacing them with neutral gray.

- [ ] **Step 4: Run stylesheet and TypeScript checks**

  Run: `pnpm lint`

  Expected: exit code 0.

### Task 4: Verify the complete application

**Files:**
- Test: generated build output and dev-server pages; no new test file required because this is a stylesheet-only regression.

**Interfaces:**
- Consumes: all changes from Tasks 1–3.
- Produces: verified lint, unit tests, production build, and visual smoke-check evidence.

- [ ] **Step 1: Run unit tests**

  Run: `pnpm test`

  Expected: all existing Vitest tests pass.

- [ ] **Step 2: Run production build**

  Run: `pnpm build`

  Expected: exit code 0 with no compilation errors.

- [ ] **Step 3: Review the final diff**

  Run: `git diff --check` and `git diff --stat`

  Expected: no whitespace errors; only palette-related files changed in this task.
