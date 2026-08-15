# Remove Admin Status Labels

## Goal

Remove the `Live-Daten` status pill from the admin dashboard header and the `System bereit` status label from the admin sidebar footer.

## Design

Delete both elements from their existing JSX locations. Keep the `Abholungen öffnen` action and `Zum Shop` link unchanged. Remove only CSS rules that exist exclusively for the deleted labels, including their responsive selectors and theme surface entry for the live-status pill. Preserve the sidebar footer container because it still owns the shop link.

## Verification

Confirm the removed text and selectors no longer occur in `src/app`, then run the repository lint command and production build.
