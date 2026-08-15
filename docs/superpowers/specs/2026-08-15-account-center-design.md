# Account Center Design

## Goal

Turn `/konto` from a navigation screen into a useful customer account center for contact data, account security, email confirmation, and pickup-order self-service.

## Approved User Experience

### Account overview (`/konto`)

The signed-in overview shows:

- Customer name, current email address, telephone number, and signed-in state.
- Email state: `Bestätigt`, `Nicht bestätigt`, or `Änderung ausstehend` when `user.new_email` is present.
- A warning and resend action when an email confirmation is outstanding.
- The newest active pickup order, prioritising `new`, `processing`, and `ready_for_pickup` orders.
- Order number, current status, pickup time, total, pickup code, and a link to the full order.
- Reschedule and cancel controls only while the order has status `new`.
- The three most recent orders and a link to the full order history.
- Quick links to catalogue, profile, security settings, order history, and administration for administrators.

### Profile (`/konto/profil`)

The customer can view and update full name and telephone number. Telephone verification by SMS is not part of this scope; the phone remains contact data in `public.profiles`.

### Security (`/konto/sicherheit`)

The customer can:

- See the current email and confirmation timestamp/state.
- Request another signup confirmation when the current email is unconfirmed.
- Change the email address through Supabase Auth.
- See the pending new address until it has been confirmed.
- Resend an email-change confirmation when applicable.
- Change the password after supplying the current password and a matching new-password confirmation.

### Signup confirmation recovery

The registration page includes a generic resend-confirmation form for users who cannot sign in because the signup email is unconfirmed. The response never reveals whether an account exists.

### Pickup orders

The existing history and detail routes remain:

- `/konto/anfragen` for all orders.
- `/konto/anfragen/[id]` for status, items, pickup appointment, pickup code, total, comment, and reorder action.

The detail route adds a status timeline and self-service controls. A customer can reschedule or cancel only while the order status is `new`. Once picking begins (`processing`), the controls are replaced with an explanation.

## Data and Security Architecture

### Supabase Auth

- Use the server-validated Supabase `User` returned by `auth.getUser()`.
- Determine confirmation from `email_confirmed_at`.
- Determine a pending email change from `new_email` and `email_change_sent_at`.
- Use `auth.resend({ type: "signup" })` for signup confirmation and `auth.resend({ type: "email_change" })` for a pending address change.
- Use `auth.updateUser({ email })` to begin an email change.
- Verify the current password using `signInWithPassword()` before calling `updateUser({ password })`.
- Never store passwords, confirmation tokens, access tokens, or service-role keys in application tables.

Production email delivery requires custom SMTP or a Send Email Auth Hook. The default Supabase SMTP service is not treated as a production delivery guarantee.

### Pickup mutation RPCs

Create authenticated-only RPCs:

- `public.reschedule_own_pickup_order(p_request_id uuid, p_pickup_slot_start timestamptz)`
- `public.cancel_own_pickup_order(p_request_id uuid)`

Each RPC:

- Derives identity from `auth.uid()` and accepts no client-supplied user ID.
- Locks the order row with `FOR UPDATE`.
- Requires `fulfillment = 'pickup'`, matching ownership, and `status = 'new'`.
- Uses generic not-found/forbidden behaviour that does not reveal other customers' orders.

Rescheduling requires an appointment at least two hours and at most 31 days in the future.

Cancellation atomically restores reserved inventory at `baumarkt-nassauer-land` and changes the status to `cancelled`. The locked `new`-status check makes the operation idempotent with respect to inventory restoration: a second call cannot restore stock twice.

Direct customer updates to `requests` and `inventory` remain forbidden by RLS. Only the narrowly scoped RPCs are granted to `authenticated`.

## Component Boundaries

- `account-dashboard` performs server-only aggregation and returns a bounded view model.
- Account overview components only render the view model.
- `account-actions` contains authenticated Server Actions for security and order mutations, keeping the already oversized general `actions.ts` from growing further.
- Security forms and order controls are small Client Components using `useActionState`.
- Pure status/capability helpers live in `account.ts` and are reused by overview, history, and detail views.

## Error Handling

All Server Actions return German user-facing messages without raw Supabase or Postgres errors. Explicit states cover:

- Current password incorrect.
- New passwords do not match or are shorter than eight characters.
- Email unchanged, invalid, already used, temporarily rate-limited, or awaiting confirmation.
- Confirmation email accepted for delivery without revealing account existence.
- Pickup order no longer editable because picking has begun.
- Pickup appointment outside the allowed window.
- Session expired or order unavailable.

Cancel requires an explicit confirmation in the browser. Pending buttons are disabled and success/error messages use `role="status"` and `role="alert"`.

## Responsive and Accessibility Requirements

- Desktop: active pickup and account state receive the strongest visual hierarchy; recent orders and quick links use a dense grid.
- Tablet: overview panels use two columns.
- Mobile: all panels and forms collapse to one column without horizontal scrolling.
- Status meaning is expressed with text, not colour alone.
- Controls have visible keyboard focus, accessible names, and minimum touch targets.
- Destructive cancellation uses a clearly differentiated button and confirmation text containing the order number.

## Verification Strategy

This work does not use test-driven development. Tests are added after the corresponding implementation and run as regression checks.

Verification includes:

- Unit tests for status capabilities, pickup-time validation, and action validation.
- Database verification for ownership, status restrictions, inventory restoration, and double-cancel protection.
- Auth verification for confirmed, unconfirmed, and pending-email-change states.
- Browser verification for standard user and administrator views at desktop and mobile widths.
- Repository lint, test, size, formatting, and production-build commands, with unrelated pre-existing failures reported separately.

## Out of Scope

- SMS verification of telephone numbers.
- Payment, refunds, invoices, loyalty programmes, addresses, wish lists, and notification preferences.
- Customer editing after order status becomes `processing`.
- New pickup-capacity or calendar tables; the existing free-form appointment model remains.
