const freeze = <T>(value: T): Readonly<T> => Object.freeze(value);

export const DEMO_CUSTOMER = freeze({
  id: "demo",
  full_name: "Anna Beispiel",
  phone: "+49 30 000000",
  role: "customer" as const,
});

const DEMO_REQUEST_ITEMS = freeze([
  freeze({
    id: "demo-line-1",
    product_id: "demo-product-1",
    sku_snapshot: "DEMO-001",
    name_snapshot: "Demo Artikel 1",
    sale_unit_snapshot: "Stück",
    quantity: 2,
    picked_qty: 0,
    unit_price: 8.95,
    line_total: 17.9,
  }),
  freeze({
    id: "demo-line-2",
    product_id: "demo-product-2",
    sku_snapshot: "DEMO-002",
    name_snapshot: "Demo Artikel 2",
    sale_unit_snapshot: "Stück",
    quantity: 1,
    picked_qty: 0,
    unit_price: 4.99,
    line_total: 4.99,
  }),
]);

export const DEMO_ORDER = freeze({
  id: "demo-1",
  user_id: "demo",
  request_number: "ABH-2026-000123",
  customer_name: "Anna Beispiel",
  customer_email: "anna@example.de",
  customer_phone: "+49 30 000000",
  postal_code: "10115",
  fulfillment: "pickup" as const,
  pickup_slot_start: "2026-08-15T13:56:08.000Z",
  pickup_code: "ABH-123",
  status: "new" as const,
  comment: "Demonstrationsanfrage.",
  subtotal: 22.89,
  currency: "EUR",
  created_at: "2026-08-15T13:56:08.000Z",
  updated_at: "2026-08-15T13:56:08.000Z",
  consent_at: "2026-08-15T13:56:08.000Z",
  request_items: DEMO_REQUEST_ITEMS,
});
