import { NextResponse } from "next/server";
import { orderTrackingSchema, trackedOrderSchema } from "@/lib/order-tracking";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = orderTrackingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Bitte prüfen Sie Bestellnummer und Abholcode." }, { status: 400 });
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ error: "Bestellstatus ist derzeit nicht verfügbar." }, { status: 503 });
  const { data, error } = await supabase.rpc("get_pickup_order_tracking", {
    p_request_number: parsed.data.requestNumber,
    p_pickup_code: parsed.data.pickupCode,
  });
  const order = trackedOrderSchema.safeParse(data);
  if (error || !order.success)
    return NextResponse.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
  return NextResponse.json(order.data);
}
