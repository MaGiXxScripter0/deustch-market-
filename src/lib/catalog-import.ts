import { z } from "zod";

export const catalogImportHeaders = [
  "sku",
  "gtin",
  "brand",
  "name_de",
  "category_slug",
  "price_gross",
  "sale_unit",
  "base_price",
  "base_unit",
  "base_quantity",
  "stock_berlin",
  "pickup_available",
  "pickup_lead_time",
  "image_url",
  "short_description_de",
  "description_de",
  "specs_json",
  "search_aliases",
  "is_featured",
  "is_active",
  "source_url",
] as const;

export type CatalogImportRow = {
  sku: string;
  gtin: string | null;
  brand: string;
  name: string;
  categorySlug: string;
  price: number;
  saleUnit: string;
  basePrice: number;
  baseUnit: string;
  baseQuantity: number;
  stockBerlin: number;
  pickupAvailable: boolean;
  pickupLeadTime: string;
  imageUrl: string | null;
  shortDescription: string;
  description: string;
  specs: Record<string, string | number | boolean>;
  aliases: string[];
  featured: boolean;
  active: boolean;
  sourceUrl: string | null;
};

type ImportResult =
  | { rows: CatalogImportRow[]; errors: [] }
  | { rows: []; errors: string[] };

function parseDelimitedRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ";" && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("Nicht geschlossene Anführungszeichen im CSV.");
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function required(value: string, field: string) {
  if (!value) throw new Error(`${field} fehlt`);
  return value;
}

function decimal(value: string, field: string, minimum = 0) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < minimum) throw new Error(`${field} ist ungültig`);
  return parsed;
}

function booleanValue(value: string, field: string) {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "ja", "yes"].includes(normalized)) return true;
  if (["false", "0", "nein", "no"].includes(normalized)) return false;
  throw new Error(`${field} muss true oder false sein`);
}

const specsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

function parseRow(values: Record<string, string>): CatalogImportRow {
  const gtin = values.gtin?.trim() || null;
  if (gtin && !/^\d{8,14}$/.test(gtin)) throw new Error("gtin muss 8–14 Ziffern enthalten");
  const sourceUrl = values.source_url?.trim() || null;
  const imageUrl = values.image_url?.trim() || null;
  for (const [field, value] of [
    ["source_url", sourceUrl],
    ["image_url", imageUrl],
  ] as const) {
    if (value && !z.url().safeParse(value).success) throw new Error(`${field} ist keine URL`);
  }
  let specs: unknown = {};
  if (values.specs_json?.trim()) {
    try {
      specs = JSON.parse(values.specs_json);
    } catch {
      throw new Error("specs_json enthält kein gültiges JSON");
    }
  }
  const parsedSpecs = specsSchema.safeParse(specs);
  if (!parsedSpecs.success) throw new Error("specs_json muss ein Objekt mit einfachen Werten sein");

  const stockBerlin = decimal(values.stock_berlin, "stock_berlin");
  return {
    sku: required(values.sku?.trim(), "sku"),
    gtin,
    brand: required(values.brand?.trim(), "brand"),
    name: required(values.name_de?.trim(), "name_de"),
    categorySlug: required(values.category_slug?.trim(), "category_slug"),
    price: decimal(values.price_gross, "price_gross"),
    saleUnit: required(values.sale_unit?.trim(), "sale_unit"),
    basePrice: decimal(values.base_price, "base_price"),
    baseUnit: required(values.base_unit?.trim(), "base_unit"),
    baseQuantity: decimal(values.base_quantity, "base_quantity", Number.EPSILON),
    stockBerlin,
    pickupAvailable: booleanValue(values.pickup_available, "pickup_available") && stockBerlin > 0,
    pickupLeadTime: values.pickup_lead_time?.trim() || "Abholbereit in 2 Stunden",
    imageUrl,
    shortDescription: values.short_description_de?.trim() || "",
    description: values.description_de?.trim() || "",
    specs: parsedSpecs.data,
    aliases: (values.search_aliases ?? "")
      .split(/[|,]/)
      .map((alias) => alias.trim())
      .filter(Boolean),
    featured: booleanValue(values.is_featured, "is_featured"),
    active: booleanValue(values.is_active, "is_active"),
    sourceUrl,
  };
}

export function parseCatalogImport(source: string): ImportResult {
  let rows: string[][];
  try {
    rows = parseDelimitedRows(source.replace(/^\uFEFF/, ""));
  } catch (error) {
    return { rows: [], errors: [error instanceof Error ? error.message : "Ungültiges CSV."] };
  }
  if (rows.length < 2) return { rows: [], errors: ["Die Datei enthält keine Produktzeilen."] };
  const headers = rows[0].map((header) => header.toLowerCase());
  const missing = catalogImportHeaders.filter((header) => !headers.includes(header));
  if (missing.length)
    return { rows: [], errors: [`Fehlende Spalten: ${missing.join(", ")}`] };
  if (rows.length - 1 > 500)
    return { rows: [], errors: ["Pro Import sind maximal 500 Produkte erlaubt."] };

  const result: CatalogImportRow[] = [];
  const errors: string[] = [];
  const skus = new Set<string>();
  for (const [offset, row] of rows.slice(1).entries()) {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    try {
      const parsed = parseRow(record);
      if (skus.has(parsed.sku)) throw new Error(`SKU ${parsed.sku} kommt mehrfach vor`);
      skus.add(parsed.sku);
      result.push(parsed);
    } catch (error) {
      errors.push(`Zeile ${offset + 2}: ${error instanceof Error ? error.message : "ungültig"}`);
    }
  }
  return errors.length ? { rows: [], errors } : { rows: result, errors: [] };
}
