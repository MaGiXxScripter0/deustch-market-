create or replace function public.set_pickup_order_status(
  p_request_id uuid,
  p_status public.request_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_status public.request_status;
begin
  if not private.is_admin() then
    raise exception 'Admin access required';
  end if;
  select status into v_previous_status
  from public.requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Order not found'; end if;
  if v_previous_status = p_status then return; end if;
  if not (
    (v_previous_status = 'new' and p_status in ('processing', 'cancelled'))
    or (v_previous_status = 'processing' and p_status in ('ready_for_pickup', 'cancelled'))
    or (v_previous_status = 'ready_for_pickup' and p_status in ('completed', 'cancelled'))
  ) then raise exception 'Invalid order status transition'; end if;
  if p_status = 'ready_for_pickup' and exists (
    select 1 from public.request_items
    where request_id = p_request_id and picked_qty < quantity
  ) then raise exception 'All order items must be picked first'; end if;
  if p_status = 'cancelled' then
    update public.inventory i
    set available_qty = i.available_qty + item.quantity, updated_at = now()
    from public.request_items item
    join public.locations l on l.slug = 'baumarkt-nassauer-land'
    where item.request_id = p_request_id
      and i.product_id = item.product_id
      and i.location_id = l.id;
  end if;
  update public.requests set status = p_status, updated_at = now() where id = p_request_id;
end;
$$;

create or replace function public.set_pickup_item_picked(
  p_request_item_id uuid,
  p_picked boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admin access required';
  end if;
  update public.request_items item
  set picked_qty = case when p_picked then item.quantity else 0 end
  from public.requests request
  where item.id = p_request_item_id
    and request.id = item.request_id
    and request.status in ('new', 'processing');
  if not found then raise exception 'Order item cannot be changed'; end if;
end;
$$;

revoke execute on function public.set_pickup_order_status(uuid, public.request_status)
  from public, anon;
grant execute on function public.set_pickup_order_status(uuid, public.request_status)
  to authenticated;

revoke execute on function public.set_pickup_item_picked(uuid, boolean)
  from public, anon;
grant execute on function public.set_pickup_item_picked(uuid, boolean)
  to authenticated;
