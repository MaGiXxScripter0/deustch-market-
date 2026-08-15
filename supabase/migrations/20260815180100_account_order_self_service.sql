-- Customer self-service for pickup appointments. All mutation functions derive
-- identity from auth.uid() and lock the order before checking its state.

create or replace function private.cancel_pickup_order_locked(p_request_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.inventory inventory
  set available_qty = inventory.available_qty + item.quantity,
      updated_at = now()
  from public.request_items item
  join public.locations location on location.slug = 'baumarkt-nassauer-land'
  where item.request_id = p_request_id
    and inventory.product_id = item.product_id
    and inventory.location_id = location.id;

  update public.requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function private.cancel_pickup_order_locked(uuid) from public, anon, authenticated;

create or replace function public.cancel_own_pickup_order(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.request_status;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select request.status into v_status
  from public.requests request
  where request.id = p_request_id
    and request.user_id = (select auth.uid())
    and request.fulfillment = 'pickup'
  for update;
  if not found then raise exception 'Order unavailable'; end if;
  if v_status <> 'new' then raise exception 'Order can no longer be cancelled'; end if;
  perform private.cancel_pickup_order_locked(p_request_id);
end;
$$;

revoke execute on function public.cancel_own_pickup_order(uuid) from public, anon;
grant execute on function public.cancel_own_pickup_order(uuid) to authenticated;

create or replace function public.reschedule_own_pickup_order(
  p_request_id uuid,
  p_pickup_slot_start timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.request_status;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select request.status into v_status
  from public.requests request
  where request.id = p_request_id
    and request.user_id = (select auth.uid())
    and request.fulfillment = 'pickup'
  for update;
  if not found then raise exception 'Order unavailable'; end if;
  if v_status <> 'new' then raise exception 'Order can no longer be rescheduled'; end if;
  if p_pickup_slot_start is null
    or p_pickup_slot_start < now() + interval '2 hours'
    or p_pickup_slot_start > now() + interval '31 days'
  then raise exception 'Invalid pickup slot'; end if;
  update public.requests
  set pickup_slot_start = p_pickup_slot_start, updated_at = now()
  where id = p_request_id;
end;
$$;

revoke execute on function public.reschedule_own_pickup_order(uuid, timestamptz)
  from public, anon;
grant execute on function public.reschedule_own_pickup_order(uuid, timestamptz) to authenticated;

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
  if not private.is_admin() then raise exception 'Admin access required'; end if;
  select status into v_previous_status from public.requests where id = p_request_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_previous_status = p_status then return; end if;
  if not (
    (v_previous_status = 'new' and p_status in ('processing', 'cancelled'))
    or (v_previous_status = 'processing' and p_status in ('ready_for_pickup', 'cancelled'))
    or (v_previous_status = 'ready_for_pickup' and p_status in ('completed', 'cancelled'))
  ) then raise exception 'Invalid order status transition'; end if;
  if p_status = 'ready_for_pickup' and exists (
    select 1 from public.request_items where request_id = p_request_id and picked_qty < quantity
  ) then raise exception 'All order items must be picked first'; end if;
  if p_status = 'cancelled' then
    perform private.cancel_pickup_order_locked(p_request_id);
    return;
  end if;
  update public.requests set status = p_status, updated_at = now() where id = p_request_id;
end;
$$;

