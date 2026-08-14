import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogData } from "@/lib/catalog-repository";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  phone: z.string().min(5).max(40),
  postalCode: z.string().regex(/^\d{5}$/),
  fulfillment: z.enum(["pickup", "delivery"]),
  comment: z.string().max(1000).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
  items: z
    .array(z.object({ productId: z.uuid(), quantity: z.number().positive().max(999) }))
    .min(1)
    .max(100),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Bitte prüfen Sie Ihre Angaben." }, { status: 400 });
  const { products } = await getCatalogData();
  const selected = parsed.data.items
    .map((line) => ({ line, product: products.find((item) => item.id === line.productId) }))
    .filter((entry) => entry.product);
  if (selected.length !== parsed.data.items.length)
    return NextResponse.json(
      { error: "Mindestens ein Produkt ist nicht mehr verfügbar." },
      { status: 409 },
    );
  const subtotal = selected.reduce(
    (sum, entry) => sum + entry.product!.price * entry.line.quantity,
    0,
  );
  const supabase = await createClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("place_request", {
      p_customer_name: parsed.data.name,
      p_customer_email: parsed.data.email,
      p_customer_phone: parsed.data.phone,
      p_postal_code: parsed.data.postalCode,
      p_fulfillment: parsed.data.fulfillment,
      p_comment: parsed.data.comment ?? "",
      p_items: parsed.data.items,
    });
    if (!error && data) return NextResponse.json({ requestNumber: data, subtotal });
    if (process.env.NODE_ENV === "production")
      return NextResponse.json(
        { error: "Die Anfrage konnte nicht gespeichert werden." },
        { status: 503 },
      );
  }
  const demoNumber = `ANF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  return NextResponse.json({ requestNumber: demoNumber, subtotal, demo: true });
}
