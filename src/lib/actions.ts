"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { productSchema, productSpecsSchema } from "./admin-product-validation";
import { categoryDeletionSchema } from "./admin-category-management";
import { parseCatalogImport } from "./catalog-import";
import { siteConfig } from "./site-config";
import { createClient, getCurrentProfile } from "./supabase/server";
import { verifyTurnstile } from "./turnstile";

export type ActionState = { error?: string; success?: string; turnstileResetId?: string };
export type CatalogImportState = ActionState & { imported?: number; errors?: string[] };

function captchaError(error: string): ActionState {
  return { error, turnstileResetId: crypto.randomUUID() };
}

function slugFromImport(name: string, sku: string) {
  const normalized = `${name}-${sku}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized.slice(0, 180) || `artikel-${crypto.randomUUID()}`;
}

const credentialsSchema = z.object({
  email: z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return captchaError(parsed.error.issues[0]?.message ?? "Ungültige Angaben.");
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), "login", await headers())))
    return captchaError(
      "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    );
  const supabase = await createClient();
  if (!supabase) return captchaError("Supabase ist noch nicht konfiguriert.");
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return captchaError("Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.");
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
  if (!parsed.success) return captchaError(parsed.error.issues[0]?.message ?? "Ungültige Angaben.");
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response"), "signup", await headers())))
    return captchaError(
      "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    );
  const supabase = await createClient();
  if (!supabase) return captchaError("Supabase ist noch nicht konfiguriert.");
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
    return captchaError(
      "Registrierung fehlgeschlagen. Die E-Mail-Adresse ist möglicherweise bereits vergeben.",
    );
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

export async function updateRequestStatusAction(formData: FormData) {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const status = z
    .enum(["new", "processing", "ready_for_pickup", "completed", "cancelled"])
    .safeParse(formData.get("status"));
  if (!status.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data: request } = await supabase
    .from("requests")
    .select("status, request_items(quantity, picked_qty)")
    .eq("id", id)
    .maybeSingle();
  if (!request) return;
  const allowedStatuses: Record<string, string[]> = {
    new: ["new", "processing", "cancelled"],
    processing: ["processing", "ready_for_pickup", "cancelled"],
    ready_for_pickup: ["ready_for_pickup", "completed", "cancelled"],
    completed: ["completed"],
    cancelled: ["cancelled"],
  };
  if (!allowedStatuses[request.status]?.includes(status.data)) return;
  const allPicked = (request.request_items ?? []).every(
    (item) => Number(item.picked_qty) >= Number(item.quantity),
  );
  if (status.data === "ready_for_pickup" && !allPicked) return;
  await supabase.rpc("set_pickup_order_status", { p_request_id: id, p_status: status.data });
  revalidatePath("/admin/anfragen");
  revalidatePath(`/admin/anfragen/${id}`);
  revalidatePath("/konto/anfragen");
}

export async function setPickupItemPickedAction(formData: FormData) {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return;
  const parsed = z
    .object({ itemId: z.uuid(), requestId: z.uuid(), picked: z.enum(["true", "false"]) })
    .safeParse({
      itemId: formData.get("itemId"),
      requestId: formData.get("requestId"),
      picked: formData.get("picked"),
    });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.rpc("set_pickup_item_picked", {
    p_request_item_id: parsed.data.itemId,
    p_picked: parsed.data.picked === "true",
  });
  revalidatePath(`/admin/anfragen/${parsed.data.requestId}`);
  revalidatePath("/admin/anfragen");
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

export async function importCatalogAction(
  _: CatalogImportState,
  formData: FormData,
): Promise<CatalogImportState> {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return { error: "Keine Administratorberechtigung." };
  const file = formData.get("catalog");
  if (!(file instanceof File)) return { error: "Bitte wählen Sie eine CSV-Datei aus." };
  if (file.size === 0 || file.size > 5_000_000)
    return { error: "Die CSV-Datei darf maximal 5 MB groß sein." };
  const parsed = parseCatalogImport(await file.text());
  if (parsed.errors.length)
    return { error: "Der Import wurde nicht gespeichert.", errors: parsed.errors };

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  const [
    { data: categories, error: categoryError },
    { data: existingProducts, error: existingError },
  ] = await Promise.all([
    supabase.from("categories").select("id, slug"),
    supabase
      .from("products")
      .select("sku, slug")
      .in(
        "sku",
        parsed.rows.map((row) => row.sku),
      ),
  ]);
  if (categoryError || existingError)
    return { error: "Katalogdaten konnten nicht gelesen werden." };

  const categoryIds = new Map((categories ?? []).map((category) => [category.slug, category.id]));
  const invalidCategories = [
    ...new Set(
      parsed.rows
        .map((row) => row.categorySlug)
        .filter((categorySlug) => !categoryIds.has(categorySlug)),
    ),
  ];
  if (invalidCategories.length)
    return { error: `Unbekannte Kategorien: ${invalidCategories.join(", ")}` };
  const existingSlugs = new Map(
    (existingProducts ?? []).map((product) => [product.sku, product.slug]),
  );
  const now = new Date().toISOString();
  const productValues = parsed.rows.map((row) => ({
    category_id: categoryIds.get(row.categorySlug)!,
    sku: row.sku,
    slug: existingSlugs.get(row.sku) ?? slugFromImport(row.name, row.sku),
    gtin: row.gtin,
    brand: row.brand,
    name_de: row.name,
    short_description_de: row.shortDescription,
    description_de: row.description,
    price_gross: row.price,
    sale_unit: row.saleUnit,
    base_price: row.basePrice,
    base_unit: row.baseUnit,
    base_quantity: row.baseQuantity,
    weight_kg: 0,
    primary_image_url: row.imageUrl,
    specs: row.specs,
    search_aliases: row.aliases,
    is_featured: row.featured,
    is_active: row.active,
    source_url: row.sourceUrl,
    last_synced_at: now,
  }));
  const { data: savedProducts, error: productError } = await supabase
    .from("products")
    .upsert(productValues, { onConflict: "sku" })
    .select("id, sku");
  if (productError || !savedProducts)
    return { error: `Produkte konnten nicht gespeichert werden: ${productError?.message ?? ""}` };

  const productIds = new Map(savedProducts.map((product) => [product.sku, product.id]));
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id")
    .eq("slug", siteConfig.pickupLocationSlug)
    .maybeSingle();
  if (locationError || !location) return { error: `Der Abholort ${siteConfig.storeName} fehlt.` };
  const { error: inventoryError } = await supabase.from("inventory").upsert(
    parsed.rows.map((row) => ({
      product_id: productIds.get(row.sku)!,
      location_id: location.id,
      available_qty: row.stockBerlin,
      pickup_available: row.pickupAvailable,
      delivery_available: false,
      lead_time_de: row.pickupLeadTime,
      updated_at: now,
    })),
  );
  if (inventoryError)
    return { error: `Abholbestand konnte nicht gespeichert werden: ${inventoryError.message}` };

  const images = parsed.rows
    .filter((row) => row.imageUrl)
    .map((row) => ({
      product_id: productIds.get(row.sku)!,
      storage_path: row.imageUrl!,
      alt_de: `${row.name} – Produktabbildung`,
      sort_order: 0,
    }));
  if (images.length) {
    const { error: imageError } = await supabase
      .from("product_images")
      .upsert(images, { onConflict: "product_id,storage_path" });
    if (imageError)
      return { error: `Bildzuordnungen konnten nicht gespeichert werden: ${imageError.message}` };
  }
  updateTag("catalog");
  revalidatePath("/sortiment");
  revalidatePath("/admin/produkte");
  revalidatePath("/admin/produkte/import");
  return {
    success: `${savedProducts.length} Produkte wurden importiert.`,
    imported: savedProducts.length,
  };
}

const categorySchema = z.object({
  id: z.guid().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(500),
  sortOrder: z.coerce.number().int().min(0).max(999),
  filters: z.string().max(500),
  imageUrl: z.union([z.url(), z.literal("")]),
});

export async function saveCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return { error: "Keine Administratorberechtigung." };
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
    filters: formData.get("filters") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Kategoriedaten." };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  const values = {
    slug: parsed.data.slug,
    name_de: parsed.data.name,
    description_de: parsed.data.description,
    image_path: parsed.data.imageUrl || null,
    sort_order: parsed.data.sortOrder,
    filter_config: parsed.data.filters
      .split(",")
      .map((filter) => filter.trim())
      .filter(Boolean),
  };
  let error: { message: string } | null;
  if (parsed.data.id) {
    ({ error } = await supabase.from("categories").update(values).eq("id", parsed.data.id));
  } else {
    ({ error } = await supabase.from("categories").insert({
      id: crypto.randomUUID(),
      ...values,
      is_active: true,
    }));
  }
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}` };
  updateTag("catalog");
  revalidatePath("/admin/kategorien");
  return { success: "Kategorie wurde gespeichert." };
}

export async function deleteCategoryAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return { error: "Keine Administratorberechtigung." };
  const parsed = categoryDeletionSchema.safeParse({
    id: formData.get("id"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { error: "Bitte geben Sie den Kategorienamen ein." };

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  const { data: category, error: readError } = await supabase
    .from("categories")
    .select("name_de")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError || !category) return { error: "Kategorie wurde nicht gefunden." };
  if (category.name_de !== parsed.data.confirmation)
    return { error: "Der eingegebene Name stimmt nicht überein." };

  const { error } = await supabase.from("categories").delete().eq("id", parsed.data.id);
  if (error) return { error: `Löschen fehlgeschlagen: ${error.message}` };
  updateTag("catalog");
  revalidatePath("/admin/kategorien");
  revalidatePath("/admin/produkte");
  revalidatePath("/sortiment");
  revalidatePath("/suche");
  return { success: "Kategorie wurde gelöscht." };
}

export async function toggleCategoryAction(formData: FormData) {
  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return;
  const parsed = z
    .object({ id: z.guid(), active: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("categories")
    .update({ is_active: parsed.data.active === "true" })
    .eq("id", parsed.data.id);
  updateTag("catalog");
  revalidatePath("/admin/kategorien");
}

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
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Produktdaten." };
  let rawSpecs: unknown;
  try {
    rawSpecs = JSON.parse(parsed.data.specs);
  } catch {
    return { error: "Technische Daten müssen gültiges JSON sein." };
  }
  const parsedSpecs = productSpecsSchema.safeParse(rawSpecs);
  if (!parsedSpecs.success)
    return { error: "Technische Daten müssen ein Objekt mit einfachen Werten sein." };
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  const productId = parsed.data.id ?? crypto.randomUUID();
  const productValues = {
    category_id: parsed.data.categoryId || null,
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
    specs: parsedSpecs.data,
    search_aliases: parsed.data.aliases
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
  const { data: savedProduct, error } = parsed.data.id
    ? await supabase
        .from("products")
        .update(productValues)
        .eq("id", productId)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("products")
        .insert({
          id: productId,
          ...productValues,
          is_active: true,
        })
        .select("id")
        .single();
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}` };
  if (!savedProduct)
    return { error: "Das Produkt wurde nicht gefunden oder kann nicht bearbeitet werden." };

  if (parsed.data.imageUrl) {
    const { error: imageError } = await supabase.from("product_images").upsert(
      {
        product_id: productId,
        storage_path: parsed.data.imageUrl,
        alt_de: `${parsed.data.name} – Produktabbildung`,
        sort_order: 0,
      },
      { onConflict: "product_id,storage_path" },
    );
    if (imageError) return { error: `Bildzuordnung fehlgeschlagen: ${imageError.message}` };
  }

  const locations = await supabase
    .from("locations")
    .select("id, slug")
    .eq("slug", siteConfig.pickupLocationSlug);
  let pickupLocations = locations.data ?? [];
  if (!locations.error && !pickupLocations.length) {
    const { data: legacyLocations, error: legacyLocationError } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", "berlin-mitte");
    if (legacyLocationError) return { error: "Abholort konnte nicht gelesen werden." };
    const legacyLocation = legacyLocations?.[0];
    if (legacyLocation) {
      const { data: renamedLocation, error: renameError } = await supabase
        .from("locations")
        .update({
          slug: siteConfig.pickupLocationSlug,
          name_de: siteConfig.pickupLocationName,
          address_de: siteConfig.address,
        })
        .eq("id", legacyLocation.id)
        .select("id, slug")
        .maybeSingle();
      if (renameError || !renamedLocation)
        return { error: "Abholort Nassau konnte nicht eingerichtet werden." };
      pickupLocations = [renamedLocation];
    }
  }
  if (locations.error || !pickupLocations.length)
    return { error: `Abholort ${siteConfig.storeName} wurde nicht gefunden.` };
  const { error: inventoryError } = await supabase.from("inventory").upsert(
    pickupLocations.map((location) => ({
      product_id: productId,
      location_id: location.id,
      available_qty: parsed.data.berlinStock,
      pickup_available: true,
      delivery_available: false,
      lead_time_de: "Abholbereit in 2 Stunden",
    })),
  );
  if (inventoryError)
    return { error: `Bestand konnte nicht gespeichert werden: ${inventoryError.message}` };
  revalidatePath("/sortiment");
  revalidatePath("/admin/produkte");
  updateTag("catalog");
  return { success: "Produkt wurde gespeichert." };
}
