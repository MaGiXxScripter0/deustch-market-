"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getCurrentProfile } from "./supabase/server";

export type ActionState = { error?: string; success?: string };

const credentialsSchema = z.object({
  email: z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist noch nicht konfiguriert." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten." };
  redirect("/konto");
}

export async function signUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentialsSchema
    .extend({
      fullName: z.string().min(2, "Bitte geben Sie Ihren Namen ein."),
      phone: z.string().optional(),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist noch nicht konfiguriert." };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone ?? "" },
    },
  });
  if (error)
    return {
      error:
        "Registrierung fehlgeschlagen. Die E-Mail-Adresse ist möglicherweise bereits vergeben.",
    };
  return { success: "Fast geschafft: Bitte bestätigen Sie Ihre E-Mail-Adresse." };
}

export async function resetPasswordAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist noch nicht konfiguriert." };
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm?next=/konto/neues-passwort`,
  });
  return { success: "Wenn ein Konto existiert, wurde eine E-Mail versendet." };
}

export async function updatePasswordAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({
      password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
      confirmation: z.string(),
    })
    .refine((data) => data.password === data.confirmation, {
      message: "Die Passwörter stimmen nicht überein.",
    })
    .safeParse({
      password: formData.get("password"),
      confirmation: formData.get("confirmation"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist noch nicht konfiguriert." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error)
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte fordern Sie ihn erneut an." };
  return { success: "Ihr Passwort wurde aktualisiert. Sie können sich jetzt anmelden." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function updateProfileAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Bitte geben Sie Ihren vollständigen Namen ein.").max(120),
      phone: z.string().trim().max(40),
    })
    .safeParse({ fullName: formData.get("fullName"), phone: formData.get("phone") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const auth = await getCurrentProfile();
  const supabase = await createClient();
  if (!auth || !supabase) return { error: "Bitte melden Sie sich erneut an." };
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id);
  if (error) return { error: "Die Profildaten konnten nicht gespeichert werden." };
  revalidatePath("/konto");
  return { success: "Ihre Profildaten wurden gespeichert." };
}

export async function updateRequestStatusAction(formData: FormData) {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const valid = ["new", "processing", "quoted", "completed", "cancelled"];
  if (!valid.includes(status)) return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("requests").update({ status }).eq("id", id);
  revalidatePath("/admin/anfragen");
}

export async function toggleProductAction(formData: FormData) {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("products").update({ is_active: active }).eq("id", id);
  updateTag("catalog");
  revalidatePath("/sortiment");
  revalidatePath("/admin/produkte");
}

const productSchema = z.object({
  id: z.uuid().optional(),
  categoryId: z.uuid(),
  sku: z.string().min(2).max(60),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.string().min(2).max(80),
  name: z.string().min(3).max(180),
  shortDescription: z.string().min(10).max(280),
  description: z.string().min(20).max(4000),
  price: z.coerce.number().nonnegative(),
  saleUnit: z.string().min(1).max(30),
  basePrice: z.coerce.number().nonnegative(),
  baseUnit: z.string().min(1).max(20),
  baseQuantity: z.coerce.number().positive(),
  coverage: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
  weight: z.coerce.number().nonnegative(),
  imageUrl: z.union([z.url(), z.literal("")]),
  specs: z.string(),
  aliases: z.string().optional(),
  berlinStock: z.coerce.number().nonnegative(),
  warehouseStock: z.coerce.number().nonnegative(),
});

export async function saveProductAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return { error: "Keine Administratorberechtigung." };
  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    categoryId: formData.get("categoryId"),
    sku: formData.get("sku"),
    slug: formData.get("slug"),
    brand: formData.get("brand"),
    name: formData.get("name"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    price: formData.get("price"),
    saleUnit: formData.get("saleUnit"),
    basePrice: formData.get("basePrice"),
    baseUnit: formData.get("baseUnit"),
    baseQuantity: formData.get("baseQuantity"),
    coverage: formData.get("coverage") ?? "",
    weight: formData.get("weight"),
    imageUrl: formData.get("imageUrl") ?? "",
    specs: formData.get("specs") ?? "{}",
    aliases: formData.get("aliases") ?? "",
    berlinStock: formData.get("berlinStock"),
    warehouseStock: formData.get("warehouseStock"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Produktdaten." };
  let specs: Record<string, unknown>;
  try {
    specs = JSON.parse(parsed.data.specs);
  } catch {
    return { error: "Technische Daten müssen gültiges JSON sein." };
  }
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  const productId = parsed.data.id ?? crypto.randomUUID();
  const { error } = await supabase.from("products").upsert({
    id: productId,
    category_id: parsed.data.categoryId,
    sku: parsed.data.sku,
    slug: parsed.data.slug,
    brand: parsed.data.brand,
    name_de: parsed.data.name,
    short_description_de: parsed.data.shortDescription,
    description_de: parsed.data.description,
    price_gross: parsed.data.price,
    sale_unit: parsed.data.saleUnit,
    base_price: parsed.data.basePrice,
    base_unit: parsed.data.baseUnit,
    base_quantity: parsed.data.baseQuantity,
    coverage_per_unit: parsed.data.coverage === "" ? null : parsed.data.coverage,
    weight_kg: parsed.data.weight,
    primary_image_url: parsed.data.imageUrl || null,
    specs,
    search_aliases: parsed.data.aliases
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    is_active: true,
  });
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}` };

  const locations = await supabase
    .from("locations")
    .select("id, slug")
    .in("slug", ["berlin-mitte", "zentrallager"]);
  if (locations.data?.length) {
    await supabase.from("inventory").upsert(
      locations.data.map((location) => ({
        product_id: productId,
        location_id: location.id,
        available_qty:
          location.slug === "berlin-mitte" ? parsed.data.berlinStock : parsed.data.warehouseStock,
        pickup_available: location.slug === "berlin-mitte",
        delivery_available: true,
        lead_time_de:
          location.slug === "berlin-mitte"
            ? "Abholbereit in 2 Stunden"
            : "Lieferbar in 2–4 Werktagen",
      })),
    );
  }
  revalidatePath("/sortiment");
  revalidatePath("/admin/produkte");
  updateTag("catalog");
  return { success: "Produkt wurde gespeichert." };
}
