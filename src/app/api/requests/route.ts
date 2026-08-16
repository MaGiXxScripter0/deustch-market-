import { NextResponse } from "next/server";
import { getCatalogData } from "@/lib/catalog-repository";
import {
  calculateRequestSubtotal,
  getPickupOrderRpcFailure,
  hasUnavailableLines,
  requestSchema,
  resolveRequestLines,
} from "@/lib/request";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const turnstileToken =
    payload && typeof payload === "object" && "cf-turnstile-response" in payload
      ? payload["cf-turnstile-response"]
      : null;
  if (!(await verifyTurnstile(turnstileToken, "checkout", request.headers)))
    return NextResponse.json(
      { error: "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut." },
      { status: 403 },
    );
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ error: "Bitte prüfen Sie Ihre Angaben." }, { status: 400 });
  const { products } = await getCatalogData();
  const selected = resolveRequestLines(parsed.data, products);
  if (selected.some((entry) => !entry.product))
    return NextResponse.json(
      { error: "Mindestens ein Produkt ist nicht mehr verfügbar." },
      { status: 409 },
    );
  if (hasUnavailableLines(parsed.data, selected))
    return NextResponse.json(
      { error: "Die gewünschte Menge ist aktuell nicht zur Abholung verfügbar." },
      { status: 409 },
    );
  const subtotal = calculateRequestSubtotal(selected);
  const supabase = await createClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("place_pickup_order", {
      p_customer_name: parsed.data.name,
      p_customer_email: parsed.data.email,
      p_customer_phone: parsed.data.phone,
      p_pickup_slot_start: parsed.data.pickupSlot,
      p_comment: parsed.data.comment ?? "",
      p_consent: true,
      p_items: parsed.data.items,
    });
    if (!error && data && typeof data === "object") {
      const order = data as { requestNumber?: string; pickupCode?: string };
      if (order.requestNumber && order.pickupCode)
        return NextResponse.json({
          requestNumber: order.requestNumber,
          pickupCode: order.pickupCode,
          pickupSlot: parsed.data.pickupSlot,
          subtotal,
        });
    }
    if (error) {
      const failure = getPickupOrderRpcFailure(error.message);
      if (failure.shouldLog)
        console.error("Pickup order RPC failed", { code: error.code, message: error.message });
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }
    if (process.env.NODE_ENV === "production")
      return NextResponse.json(
        { error: "Die Bestellung konnte nicht gespeichert werden." },
        { status: 503 },
      );
  }
  const demoNumber = `ABH-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  return NextResponse.json({
    requestNumber: demoNumber,
    pickupCode: "DEMO00",
    pickupSlot: parsed.data.pickupSlot,
    subtotal,
    demo: true,
  });
}
