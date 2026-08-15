# Admin Unified Work Center Design

## Summary

Transform `/admin/anfragen` from a pickup-order list into a unified German-language work
center for a team of two to three employees. The center combines pickup operations and customer
conversations in one workspace while keeping order fulfillment and communication as separate
domain workflows.

The design must remain usable when daily volume is unknown. The first screen therefore uses
server-side filtering, indexed sorting, and cursor pagination instead of loading a fixed maximum
number of records. Enterprise helpdesk features such as omnichannel synchronization, AI replies,
and complex routing rules are explicitly deferred.

## Goals

- Give employees one place to find pickup orders and customer questions.
- Make ownership, urgency, next action, and current state visible without opening an item.
- Preserve the existing pickup workflow, inventory reservation, picking, cancellation, and
  customer self-service behavior.
- Support safe collaboration by two or three employees without silent overwrites.
- Provide a responsive, keyboard-accessible interface in German.
- Establish data boundaries that can scale without turning `public.requests` into an overloaded
  universal table.

## Non-goals

- Gmail, Outlook, WhatsApp, Instagram, or other omnichannel synchronization in the first two
  releases.
- Automatic or AI-generated replies.
- A no-code workflow builder or arbitrary user-created automation rules.
- Bulk changes to physical order status.
- Replacing the existing account, checkout, inventory, or pickup-order domain.

## Product Model

`/admin/anfragen` remains the stable route and becomes the daily work center. Its system views are
computed dynamically:

- `Alle`
- `Abholungen`
- `Kundenfragen`
- `Mir zugewiesen`
- `Nicht zugewiesen`
- `Überfällig`
- `Erledigt`

An item may appear in more than one view. Views are filters, not folders, so a record cannot be
lost because it was manually moved into an exclusive container.

Orders and conversations remain distinct:

- `Bestellstatus` describes physical fulfillment.
- `Anfragestatus` describes communication.
- Changing one status never changes the other implicitly.
- A support thread may reference one pickup order, while both orders without conversations and
  conversations without orders remain valid.

### Order statuses

The existing bounded order states remain unchanged:

- `Eingegangen`
- `In Bearbeitung`
- `Abholbereit`
- `Abgeholt`
- `Storniert`

The existing transition rules continue to require complete picking before `Abholbereit` and
inventory restoration on cancellation.

### Conversation statuses

- `Neu`: no employee has started processing the thread.
- `Offen`: an employee is actively responsible for the thread.
- `Wartet auf Kunde`: the shop has replied and needs customer input.
- `Gelöst`: the reported issue has been resolved.
- `Geschlossen`: the thread is removed from active queues but retained in history.

## Information Architecture and Layout

### Desktop

Use a three-region master-detail workspace inside the existing admin shell:

1. A 180–220 px work-view rail.
2. A 420–520 px work-item list.
3. A detail pane that consumes the remaining usable width.

The page header contains `Anfragen & Abholungen`, compact counters for `Neu`, `Überfällig`,
`Wartet auf uns`, and `Heute abzuholen`, global search, `Neue Anfrage`, and a comfortable/compact
density control. The header, view rail, list, and detail pane use appropriate sticky regions and
independent scrolling so selecting or updating an item does not lose the employee's list context.

The existing dark-green admin shell and orange BNL accent remain. Reduce unused whitespace,
increase secondary-text contrast, and standardize status badges, fields, buttons, and spacing.

### Tablet and mobile

On tablets, replace the persistent work-view rail with a compact view selector. On phones, render
work items as cards and open details as a dedicated full-screen route state. Primary actions live
in a sticky bottom bar; secondary actions live in an overflow menu. Interactive targets are at
least 44 px high, long German copy and email addresses wrap, and the page has no horizontal
scrolling at 390 px.

### Work-item row

Every row or mobile card shows:

- textual type plus icon: `Abholung` or `Kundenfrage`;
- customer name and short subject;
- related order number when present;
- textual status badge;
- employee or `Nicht zugewiesen`;
- priority;
- due state such as `Heute, 14:30`, `noch 42 Min.`, or `35 Min. überfällig`;
- last activity time;
- unread state expressed with text weight and a marker, never color alone.

Active filters appear as removable chips above the list. The result count states how many records
match, and clearing one chip does not reset unrelated filters. The selected item remains visually
highlighted and addressable in the URL.

### Detail pane

Pickup details show order lines, picking progress, pickup time, pickup code, customer context, and
allowed order transitions. Conversation details show the timeline, composer, internal notes,
assignment, priority, tags, due time, customer context, and related order. A conversation linked
to a pickup displays both contexts without merging their state machines.

## Operational Workflows

### Assignment

- Each work item has at most one assigned employee.
- Any administrator can claim an unassigned item through `Übernehmen`.
- Reassignment records the previous employee, new employee, actor, and timestamp.
- `Mir zugewiesen` and `Nicht zugewiesen` are system views and require no configuration.

### Deadlines and priority

The initial SLA model is deliberately small. A new customer question is due for first handling
within two clock hours. This is a visible operational target, not a contractual promise. Pickup
orders use `pickup_slot_start` as their operational deadline. Items approaching or exceeding a
deadline sort above routine work when the user chooses urgency sorting.

The initial priority set is `Niedrig`, `Normal`, `Hoch`, and `Dringend`. Text, icon, and color all
communicate priority and due state. Business-hours calendars and per-category SLA policies are
deferred to Release C.

### Quick actions

Common actions are:

- claim or assign;
- change priority;
- reply;
- add internal note;
- set `Wartet auf Kunde`;
- resolve or close;
- open the next item in the active queue.

Pickup-specific actions remain:

- start picking;
- mark individual lines as picked;
- mark ready only after all lines are picked;
- record pickup completion;
- cancel with a mandatory reason.

### Bulk actions

Bulk actions include assign, change priority, change conversation status, add tag, and close.
Before applying, show the exact action and item count. Use optimistic concurrency so items modified
after selection are skipped rather than overwritten. Return a partial-success report listing
updated and skipped records. Never support bulk physical-order status changes.

## Customer Communication

The store owns the primary conversation record. Initial conversation sources are:

- the contact form;
- a question submitted from an order page;
- a signed-in account request;
- an employee-created record for a phone call.

A pickup-order checkout comment remains order context and does not create a support thread
automatically.

The conversation timeline contains customer messages, employee replies, internal notes, and system
events. `Antwort` and `Interne Notiz` use distinct modes, explanatory copy, and submission labels.
The reply composer always shows the recipient. An internal note cannot enter a customer-visible
query result or email payload.

Signed-in customers continue the thread under `/konto/anfragen/[id]`. Guests receive an email with
a short excerpt and a time-limited, high-entropy link. The server exchanges that token for one
specific thread; anonymous clients never query support tables directly. The database record is the
authoritative conversation, while email is a notification channel.

Release B includes editable German templates for receipt confirmation, data clarification, pickup
readiness, pickup-time changes, stock questions, and closing. Templates only prefill the composer;
employees must review and explicitly send every reply.

## Data Architecture

Keep `public.requests` and `public.request_items` focused on orders. Add:

- `support_threads`: customer, optional `request_id`, subject, category, conversation status,
  priority, optional assignee, first-response deadline, timestamps, and last-activity metadata.
- `support_messages`: thread, author metadata, visibility (`customer`, `internal`, or `system`),
  body, delivery state, and timestamps.
- `support_events`: append-only assignment, state, priority, deadline, and system audit events.
- `support_guest_tokens`: token hash, thread, expiry, use/revocation metadata, and timestamps.
- `email_outbox`: message reference, recipient, template/payload metadata, attempts, next attempt,
  delivery state, and provider-safe idempotency key.

Employees are existing profiles with the admin role. Do not introduce a second staff directory in
this scope.

The application repository maps order rows and support-thread rows into a shared discriminated
union `AdminWorkItem`. Shared fields support the queue; order-only or conversation-only details are
loaded after selection. The union does not imply a polymorphic database table.

### Query and URL model

- Filter and search server-side.
- Use cursor pagination with a deterministic tie-breaker instead of `limit(100)`.
- Default to urgency and then recent activity; expose newest, oldest, pickup time, and priority
  sorting where relevant.
- Persist view, filters, cursor direction, density, and selected item in search parameters.
- Search customer name, email, order number, subject, and message text through bounded indexed
  search appropriate to the final migration.

## Mutation, Concurrency, and Delivery

Use Server Actions for UI mutations and narrowly scoped database RPCs for multi-row or state-machine
operations. Every mutation rechecks the admin role and validates the requested transition on both
the application and database boundaries.

Use the record's last known `updated_at` or explicit version in mutation preconditions. A stale
mutation returns `Diese Anfrage wurde inzwischen geändert` and fresh data without discarding a
local reply draft. List auto-refresh displays a `Neue Anfragen` indicator and does not reorder the
current list while the employee is selecting or composing.

Reply submission atomically stores the public message, audit event, and email-outbox row. Delivery
runs separately. A provider failure marks the message `Zustellung fehlgeschlagen` and offers an
idempotent retry; it never deletes the saved message or creates a duplicate customer-visible reply.

## Authorization and Privacy

- Admin profiles may read and operate on all work items.
- Signed-in customers may read and append public messages only to their own threads and may never
  set admin-owned workflow fields.
- Other customers receive no evidence that a thread exists.
- Guest access is performed through a server boundary using a hashed, expiring token scoped to one
  thread.
- Anonymous users have no direct table grants for support data.
- Internal messages are excluded by RLS and server queries, not only hidden in the UI.
- Audit events are append-only to application roles.
- Email addresses, phone numbers, message bodies, and guest tokens must not appear in application
  logs.

## Error Handling and Collaboration

- A failed action retains the selected item, filters, scroll position, and composer draft.
- Inline errors use `role="alert"`; success feedback uses polite live regions.
- Buttons disable only for their own in-flight operation.
- Each submission carries an idempotency key.
- Draft text is kept locally for network failure recovery and removed after confirmed persistence.
- Concurrent changes show the actor and time when available and require a refresh before retry.
- Closing one normal conversation offers Undo; bulk closing requires confirmation.
- Pickup cancellation requires a reason and continues to use the existing atomic inventory restore.
- Empty states distinguish an empty system, no filter matches, no assignment to the current employee,
  and an authorization failure.

## Accessibility and Localization

- All controls and workflows are keyboard operable with a visible focus indicator.
- Status, priority, unread, and due state never depend on color alone.
- Queue, detail regions, headings, labels, and focus order provide useful screen-reader structure.
- `Escape` closes mobile overlays without discarding drafts.
- Field errors use `aria-describedby` and focus the first invalid field after submission.
- Text and controls meet WCAG AA contrast.
- Motion respects `prefers-reduced-motion`.
- Dates, times, currency, pluralization, and operational copy use German conventions consistently.
- Long names, email addresses, subjects, and order numbers wrap without horizontal overflow.

## Release Strategy

This design defines the shared product direction, but each release receives its own implementation
plan and review cycle. Release A is the first implementation boundary and must ship as a complete,
independently usable improvement before Release B begins. Release C is planned only after observing
real usage of Releases A and B.

### Release A: operational center

- Shared `AdminWorkItem` boundary.
- System views, URL filters, search, urgency sorting, and cursor pagination.
- Assignment, priority, deadline, and history for operational work.
- Desktop master-detail layout and mobile cards/detail route.
- Existing pickup workflow integrated into the new detail experience.
- Loading, empty, error, stale-data, accessibility, and responsive states.

Release A may create the minimum support-thread schema required for manually entered customer
questions, but it does not expose customer messaging until Release B. It remains independently
deployable and leaves all existing pickup behavior working.

### Release B: customer communication

- Public messages, internal notes, and system timeline.
- Contact and order-question entry points.
- Signed-in account conversation UI.
- Guest-token flow.
- Atomic email outbox, delivery status, and retry.
- Editable German reply templates.

### Release C: measured optimization

- Safe bulk actions.
- User-saved private views and admin-managed shared views.
- Business hours and category-specific SLA policies.
- Keyboard command palette and macros.
- First-response, resolution-time, SLA-breach, and backlog reporting.
- Automatic assignment rules.
- External communication channels only after measured demand.

## Verification Strategy

### Unit tests

- Work-item mapping, filter normalization, cursor encoding, deterministic sorting, deadline
  calculation, allowed transitions, and template interpolation.
- Assignment, priority, order, and conversation workflow rules.
- Guest-token hashing/expiry and email idempotency helpers.

### Server and database tests

- Server Actions reject non-admin users, invalid transitions, stale versions, duplicate submissions,
  and unsafe bulk operations.
- RLS scenarios cover admin, owner, another customer, guest server access, and internal notes.
- Message, audit event, and outbox insertion are atomic.
- Partial bulk success never overwrites stale records.
- Existing order placement, reservation, picking, rescheduling, cancellation, and inventory
  restoration remain correct.

### Browser verification

- Exercise desktop, tablet, and phone layouts at 1440 px, 768 px, and 390 px.
- Verify keyboard-only queue navigation, reply/note modes, focus restoration, live feedback, and
  destructive confirmations.
- Exercise loading, empty, no-match, delivery failure, offline draft, stale update, and partial bulk
  states.
- Confirm no horizontal overflow and at least 44 px mobile targets.

### Scale verification

Seed enough synthetic orders, threads, messages, and audit events to validate cursor pagination and
query plans. The first queue page must have bounded work independent of total record count, and
filters used by system views must be backed by appropriate indexes.

## Success Criteria

- Ownership, priority, due state, and next action are visible from the queue.
- An unassigned item can be claimed with one explicit action.
- Details open without losing queue selection, filters, or scroll position.
- Routine state changes take no more than two explicit actions.
- No destructive operation can occur through an accidental single click.
- Internal notes cannot be returned or delivered to customers.
- Concurrent employees cannot silently overwrite each other.
- The 390 px experience has no horizontal scrolling.
- Queue-page work remains bounded as total volume grows.
- Existing checkout, inventory, and pickup workflows retain their behavior.
- Email delivery failure is visible and retryable without losing or duplicating a message.

## Competitive Research Applied

The design adapts, rather than copies, the following public patterns:

- Shopify: saved filtered order views, compound filters, broad order search, bulk selection, and
  quick order/customer context.
  <https://help.shopify.com/en/manual/fulfillment/managing-orders/viewing-orders/filtering-orders>
- Zendesk: dynamic views, next-SLA-breach sorting, sequential ticket work, and stale-safe partial
  bulk processing.
  <https://support.zendesk.com/hc/en-us/articles/5430058226330-Sorting-and-filtering-tickets-in-a-view-to-refine-results>
- Gorgias: shared/private views, system queues, assignee filters, macros, and the separation of
  dynamic views from record state.
  <https://docs.gorgias.com/en-US/manage-views-and-sections-in-gorgias-207768>
- Intercom: list/detail inbox workflow, search within views, reply/note separation, assignment,
  snooze, priority, and bulk actions.
  <https://www.intercom.com/help/en/articles/6258745-the-inbox-explained>
- Etsy: dashboard emphasis on messages that require a timely response.
  <https://help.etsy.com/hc/en-us/articles/360000343908-How-to-Use-Your-Dashboard-to-Manage-Your-Shop>

For a two-to-three-person team, the selected design intentionally omits the largest platforms'
complex view builders, omnichannel integrations, and extensive automation until usage data justifies
them.
