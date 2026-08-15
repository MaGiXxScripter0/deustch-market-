-- Guests can retrieve only non-personal order progress with both order number and pickup code.
create or replace function public.get_pickup_order_tracking(
  p_request_number text,
  p_pickup_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_items jsonb;
begin
  if upper(trim(p_request_number)) !~ '^ABH-[0-9]{4}-[0-9]{6}$'
    or upper(trim(p_pickup_code)) !~ '^[A-Z0-9]{6}$' then
    return null;
  end if;

  select request_number, status, subtotal, pickup_slot_start, pickup_code
  into v_order
  from public.requests
  where request_number = upper(trim(p_request_number))
    and pickup_code = upper(trim(p_pickup_code));
  if not found then return null; end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sku', item.sku_snapshot,
        'name', item.name_snapshot,
        'unit', item.sale_unit_snapshot,
        'quantity', item.quantity,
        'lineTotal', item.line_total
      ) order by item.id
    ),
    '[]'::jsonb
  ) into v_items
  from public.request_items item
  where item.request_id = (select id from public.requests where request_number = v_order.request_number);

  return jsonb_build_object(
    'requestNumber', v_order.request_number,
    'status', v_order.status,
    'subtotal', v_order.subtotal,
    'pickupSlot', v_order.pickup_slot_start,
    'pickupCode', v_order.pickup_code,
    'items', v_items
  );
end;
$$;

revoke execute on function public.get_pickup_order_tracking(text, text)
  from public, anon, authenticated;
grant execute on function public.get_pickup_order_tracking(text, text)
  to anon, authenticated;
