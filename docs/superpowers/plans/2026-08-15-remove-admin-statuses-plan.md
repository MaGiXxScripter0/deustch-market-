# Remove Admin Status Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the two admin status labels requested in the browser comments without changing neighboring actions or navigation.

**Architecture:** Keep the existing admin layout and dashboard structure. Delete the two status spans and remove their exclusive CSS selectors while retaining the sidebar footer for the shop link.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, ESLint, pnpm.

## Global Constraints

- Do not modify unrelated existing working-tree changes.
- Keep `Abholungen öffnen` and `Zum Shop` visible and unchanged.
- Remove both labels from JSX rather than hiding them only with CSS.

---

### Task 1: Remove the admin status labels

**Files:**
- Modify: `src/app/admin/page.tsx` — remove the `Live-Daten` span.
- Modify: `src/app/admin/layout.tsx` — remove the `System bereit` span.
- Modify: `src/app/styles/admin.css` — remove exclusive live-status and footer-label rules/selectors.
- Modify: `src/app/styles/theme.css` — remove the deleted live-status selector from the shared surface rule.

**Interfaces:**
- Consumes: Existing admin dashboard and layout components.
- Produces: The same admin page with both requested status labels absent and neighboring controls preserved.

- [ ] **Step 1: Remove the two JSX spans**

Delete `<span className="admin-live-status"><i aria-hidden="true" /> Live-Daten</span>` from the dashboard hero actions and delete `<span><i aria-hidden="true" />System bereit</span>` from the sidebar footer.

- [ ] **Step 2: Remove exclusive CSS**

Remove the `.admin-live-status` block, remove the `.admin-nav-footer > span` and indicator rules, and remove responsive selectors that target the deleted elements. Keep `.admin-nav-footer` and its link styles.

- [ ] **Step 3: Verify the source**

Run `rg -n "Live-Daten|System bereit|admin-live-status|admin-nav-footer > span" src/app` and expect no matches.

- [ ] **Step 4: Run checks**

Run `pnpm lint` and `pnpm build`; both should exit successfully.

- [ ] **Step 5: Review the diff**

Run `git diff -- src/app/admin/page.tsx src/app/admin/layout.tsx src/app/styles/admin.css src/app/styles/theme.css` and confirm only the requested labels and their exclusive styles changed.
