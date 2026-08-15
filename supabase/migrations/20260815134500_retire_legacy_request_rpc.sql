-- The legacy delivery-oriented endpoint is no longer used by the application.
revoke all on function public.place_request(text, text, text, text, public.fulfillment_type, text, boolean, jsonb)
from public, anon, authenticated;
