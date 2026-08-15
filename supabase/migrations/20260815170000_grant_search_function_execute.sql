-- Product updates recalculate the generated search_document column as the
-- authenticated caller, so the helper must be executable by that role.
grant execute on function public.array_to_search_text(text[]) to authenticated;
