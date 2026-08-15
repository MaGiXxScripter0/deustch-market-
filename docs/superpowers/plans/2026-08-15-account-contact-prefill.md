# Account Contact Prefill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefill the pickup-order contact fields from the signed-in customer account while keeping every field editable and preserving guest checkout.

**Architecture:** The server page reads the current Supabase user/profile through `getCurrentProfile()` and passes a small `initialContact` object to the client form. A pure helper in `src/lib/request.ts` normalizes optional auth/profile values, while the form uses `defaultValue`; order submission and the existing `place_pickup_order` RPC remain unchanged.

**Tech Stack:** Next.js 16 App Router, React 19 client component, TypeScript, Supabase SSR, Vitest, pnpm.

## Global Constraints

- Keep the form fields editable after prefilling.
- Guests must continue to see empty contact fields.
- Do not pass a user ID from the browser or change the database schema/RPC contract.
- Do not update the persistent profile when a customer edits checkout fields.
- Preserve existing German copy, validation, `autoComplete`, and security checks.

---

### Task 1: Add a tested contact-defaults mapper

**Files:**

- Modify: `src/lib/request.ts`
- Test: `src/lib/request.test.ts`

**Interfaces:**

- Produces `RequestContactDefaults = { name: string; email: string; phone: string }`.
- Produces `getRequestContactDefaults(input)` which accepts optional `user.email`, `profile.full_name`, and `profile.phone` values and returns trimmed strings, falling back to empty strings.

- [ ] **Step 1: Write the failing tests**

Add tests covering a complete signed-in profile, missing profile values, and whitespace trimming:

```ts
import { getRequestContactDefaults } from "./request";

it("maps account contact data to checkout defaults", () => {
  expect(
    getRequestContactDefaults({
      email: "kunde@example.com",
      fullName: " Max Mustermann ",
      phone: " +49 123 456 ",
    }),
  ).toEqual({ name: "Max Mustermann", email: "kunde@example.com", phone: "+49 123 456" });
});

it("keeps missing account fields empty", () => {
  expect(getRequestContactDefaults({ email: null, fullName: null, phone: undefined })).toEqual({
    name: "",
    email: "",
    phone: "",
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec vitest run src/lib/request.test.ts`

Expected: FAIL because `getRequestContactDefaults` is not yet exported.

- [ ] **Step 3: Implement the minimal mapper**

Add the exported type and function to `src/lib/request.ts`; normalize each nullable/optional value with `(value ?? "").trim()` and return the three form-facing keys.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm exec vitest run src/lib/request.test.ts`

Expected: PASS, including all existing request-schema tests.

- [ ] **Step 5: Commit the unit-level change**

Run: `git add src/lib/request.ts src/lib/request.test.ts && git commit -m "feat: map account contacts for pickup checkout"`

### Task 2: Pass account defaults into the pickup form

**Files:**

- Modify: `src/app/anfrage/page.tsx`
- Modify: `src/components/request-form.tsx`

**Interfaces:**

- `RequestForm` accepts `initialContact?: RequestContactDefaults`.
- The server page supplies the mapped values from `getCurrentProfile()` or an empty default for guests.

- [ ] **Step 1: Update the server page data flow**

Import `getCurrentProfile` and `getRequestContactDefaults`. In `RequestPage`, await `getCurrentProfile()`, then derive:

```ts
const auth = await getCurrentProfile();
const initialContact = getRequestContactDefaults({
  email: auth?.user.email,
  fullName: auth?.profile?.full_name,
  phone: auth?.profile?.phone,
});
```

Pass `initialContact` to `<RequestForm products={products} initialContact={initialContact} />`.

- [ ] **Step 2: Use initial values without making inputs controlled**

Extend the component props and set `defaultValue={initialContact.name}`, `defaultValue={initialContact.email}`, and `defaultValue={initialContact.phone}`. Keep the existing `name`, `required`, `autoComplete`, and input types unchanged so edits are included by the existing `FormData` submission.

- [ ] **Step 3: Run type and lint checks for the changed files**

Run: `pnpm lint`

Expected: PASS with no new lint or TypeScript errors.

- [ ] **Step 4: Commit the form integration**

Run: `git add src/app/anfrage/page.tsx src/components/request-form.tsx && git commit -m "feat: prefill pickup checkout from account"`

### Task 3: Verify the complete change

**Files:**

- Inspect: `docs/superpowers/specs/2026-08-15-account-contact-prefill-design.md`
- Inspect: changed files and git diff

- [ ] **Step 1: Run the complete automated checks**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm lint`

Expected: PASS.

Run: `pnpm format:check`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 2: Review the final diff**

Run: `git diff HEAD~2..HEAD -- src/app/anfrage/page.tsx src/components/request-form.tsx src/lib/request.ts src/lib/request.test.ts`

Confirm that only the initial contact values were added, fields remain editable, guests receive empty strings, and no RPC/schema/auth authorization code changed.

- [ ] **Step 3: Report verification and remaining manual check**

Report the commits and command results. The remaining browser check is to open `/anfrage` once as a guest and once as a signed-in user, confirm the three defaults, edit one field, and verify the edited value is submitted.
