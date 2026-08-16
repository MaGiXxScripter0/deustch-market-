# Checkout RPC Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return safe, actionable checkout errors when the pickup-order RPC rejects a transaction.

**Architecture:** Keep database error interpretation in a pure helper in `src/lib/request.ts`; the route handler calls it after the RPC and logs only unexpected technical details server-side.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, Supabase JS, Vitest.

## Global Constraints

- Do not expose Supabase codes, hints, or database error text to the browser.
- Keep all customer-facing messages in German.
- Preserve the demo-mode response when Supabase is not configured.
- Use test-first development and two-space, Prettier-formatted TypeScript.

---

### Task 1: Classify failed pickup-order RPC calls

**Files:** `src/lib/request.ts`, `src/lib/request.test.ts`, `src/app/api/requests/route.ts`.

- [ ] Write a failing test for `getPickupOrderRpcFailure("Insufficient pickup inventory")` returning the German availability error, 409, and `shouldLog: false`.
- [ ] Run `pnpm exec vitest run src/lib/request.test.ts` and confirm the test fails because the helper does not exist.
- [ ] Implement the helper; map unavailable products to the same conflict, invalid pickup slots to 400, and unknown errors to the existing general 503 response.
- [ ] Use the helper in the Route Handler, logging unexpected Supabase errors server-side only.
- [ ] Run the focused test, `pnpm test`, `pnpm lint`, and `pnpm build`.
