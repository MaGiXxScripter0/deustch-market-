# Compact Account Dashboard Design

## Goal

Make the customer account area a compact, practical dashboard and ensure every account entry point reflects the visitor's actual authentication state.

## Scope

- Redesign `/konto` as a dense working dashboard while retaining the current brand colours, typography, and German copy style.
- Keep the signed-in dashboard limited to existing data and actions: orders, catalogue, administration for admins, profile editing, and sign-out.
- Make `/konto/anmelden` show an authenticated-state screen instead of an authentication form when a valid session already exists.
- Make the site header distinguish signed-in users from guests: signed-in users see `Angemeldet` and `Mein Konto`; guests see `Anmelden`.
- Preserve the current Supabase session and role model. No schema, policy, or session-flow changes are part of this work.

## Information Architecture

### Signed-in account (`/konto`)

1. A compact account header shows the greeting, the user name when available, email address, `Angemeldet` status, and a sign-out control.
2. A responsive quick-action grid follows, with `Meine Bestellungen` and `Sortiment` for every user and `Administration` only when `profile.role === "admin"`.
3. Each action is a large, entire-card link with an icon, concise description, directional affordance, and accessible hover and keyboard-focus feedback.
4. The existing profile editor sits below the action grid in a separate, dense form panel.

### Guest account (`/konto`)

Show a concise welcome state with the existing `Anmelden` and `Konto erstellen` actions. Do not show authenticated-only actions or account data.

### Login route (`/konto/anmelden`)

When no session exists, retain the current login page and form. When a session exists, replace the form and registration links with:

- Heading: `Sie sind bereits angemeldet.`
- Supporting copy stating that the account dashboard is available.
- Primary link: `Zum Konto` to `/konto`.

The contextual marketing aside can remain visible so the route retains the established layout.

### Global header

Authentication state must be read on the server and passed to the interactive header component as minimal display data. The account shortcut shows:

- Guest: `Mein Konto` and `Anmelden`.
- Signed in: `Mein Konto` and `Angemeldet`, optionally using the first available user name as supporting text only when it fits the current design.

No sensitive profile data is sent to the browser beyond the minimal display name/status required by the header.

## Responsive and Accessibility Requirements

- Desktop: quick actions use a two- or three-column compact grid based on the available role-specific cards; profile fields remain space-efficient.
- Tablet: action cards and profile inputs use a two-column grid.
- Mobile: header actions, quick-action cards, and profile inputs collapse to one column without horizontal overflow.
- Interactive cards and buttons have keyboard focus indicators, accessible names, and sufficient contrast in all visual states.
- Status and form responses retain the existing `role="status"` / `role="alert"` semantics.

## Technical Boundaries

- Continue using `getCurrentProfile()` for server-side session and profile lookup.
- Do not rely on the client header alone to infer authentication state.
- Server Actions continue to authenticate and authorize independently; this visual update adds no authorization bypasses.
- Keep `/konto` dynamically rendered because it reads request cookies through the Supabase server client.

## Verification Approach

This work explicitly does not use test-driven development. After implementation, run static checks and build checks, then verify guest, signed-in, and administrator routes manually at desktop and mobile viewport widths.
