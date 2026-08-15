-- Pickup-only checkout: reserve shop inventory when an order is placed.

alter type public.request_status add value if not exists 'ready_for_pickup';

alter table public.requests alter column postal_code drop not null;

create or replace function public.place_pickup_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_comment text,
  p_consent boolean,
  p_items jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_request_number text;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric(12, 3);
  v_product record;
  v_subtotal numeric(12, 2) := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'At least one item is required';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many items';
  end if;
  if length(trim(p_customer_name)) < 2 or length(trim(p_customer_name)) > 120 then
    raise exception 'Invalid customer name';
  end if;
  if length(trim(p_customer_phone)) < 5 or length(trim(p_customer_phone)) > 40 then
    raise exception 'Invalid phone number';
  end if;
  if length(trim(p_customer_email)) > 254
    or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email address';
  end if;
  if length(coalesce(p_comment, '')) > 1000 then
    raise exception 'Comment is too long';
  end if;
  if p_consent is not true then
    raise exception 'Consent is required';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item ->> 'productId'
    having count(*) > 1
  ) then
    raise exception 'Duplicate products are not allowed';
  end if;

  v_request_number := format(
    'ABH-%s-%s',
    extract(year from now())::integer,
    lpad(nextval('public.request_number_seq')::text, 6, '0')
  );

  insert into public.requests (
    request_number, user_id, customer_name, customer_email, customer_phone,
    fulfillment, comment, subtotal, consent_at
  ) values (
    v_request_number, auth.uid(), trim(p_customer_name), lower(trim(p_customer_email)),
    trim(p_customer_phone), 'pickup', coalesce(p_comment, ''), 0, now()
  ) returning id into v_request_id;

  -- The deterministic order prevents two overlapping carts from deadlocking on inventory rows.
  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value ->> 'productId'
  loop
    begin
      v_product_id := (v_item ->> 'productId')::uuid;
      v_quantity := (v_item ->> 'quantity')::numeric;
    exception
      when invalid_text_representation then
        raise exception 'Invalid order item';
    end;

    if v_quantity <= 0 or v_quantity > 999 then
      raise exception 'Invalid quantity';
    end if;

    select
      p.id,
      p.sku,
      p.name_de,
      p.sale_unit,
      p.price_gross,
      i.available_qty
    into v_product
    from public.products p
    join public.inventory i on i.product_id = p.id
    join public.locations l on l.id = i.location_id
    where p.id = v_product_id
      and p.is_active
      and l.slug = 'berlin-mitte'
      and i.pickup_available
    for update of i;

    if not found then
      raise exception 'Product is not available for pickup';
    end if;
    if v_product.available_qty < v_quantity then
      raise exception 'Insufficient pickup inventory';
    end if;

    update public.inventory
    set available_qty = available_qty - v_quantity,
        updated_at = now()
    where product_id = v_product.id
      and location_id = (
        select id from public.locations where slug = 'berlin-mitte'
      );

    insert into public.request_items (
      request_id, product_id, sku_snapshot, name_snapshot, sale_unit_snapshot,
      quantity, unit_price, line_total
    ) values (
      v_request_id, v_product.id, v_product.sku, v_product.name_de, v_product.sale_unit,
      v_quantity, v_product.price_gross, round(v_product.price_gross * v_quantity, 2)
    );

    v_subtotal := v_subtotal + round(v_product.price_gross * v_quantity, 2);
  end loop;

  update public.requests
  set subtotal = v_subtotal,
      updated_at = now()
  where id = v_request_id;

  return v_request_number;
end;
$$;

revoke execute on function public.place_pickup_order(text, text, text, text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.place_pickup_order(text, text, text, text, boolean, jsonb)
  to anon, authenticated;

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
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select status into v_previous_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if v_previous_status = p_status then
    return;
  end if;
  if not (
    (v_previous_status = 'new' and p_status in ('processing', 'cancelled'))
    or (v_previous_status = 'processing' and p_status in ('ready_for_pickup', 'cancelled'))
    or (v_previous_status = 'ready_for_pickup' and p_status in ('completed', 'cancelled'))
  ) then
    raise exception 'Invalid order status transition';
  end if;

  if p_status = 'cancelled' then
    update public.inventory i
    set available_qty = i.available_qty + item.quantity,
        updated_at = now()
    from public.request_items item
    join public.locations l on l.slug = 'berlin-mitte'
    where item.request_id = p_request_id
      and i.product_id = item.product_id
      and i.location_id = l.id;
  end if;

  update public.requests
  set status = p_status,
      updated_at = now()
  where id = p_request_id;
end;
$$;

revoke execute on function public.set_pickup_order_status(uuid, public.request_status)
  from public, anon;
grant execute on function public.set_pickup_order_status(uuid, public.request_status)
  to authenticated;
