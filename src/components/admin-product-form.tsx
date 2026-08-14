"use client";

import Image from "next/image";
import Link from "next/link";
import { ImagePlus, LoaderCircle, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { saveProductAction } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/lib/types";

export function AdminProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const [state, action, pending] = useActionState(saveProductAction, {});
  const [imageUrl, setImageUrl] = useState(product?.image ?? "");
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const path = `products/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
      });
      if (error) throw error;
      setImageUrl(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    } catch {
      window.alert(
        "Bild konnte nicht hochgeladen werden. Prüfen Sie Adminrolle und Storage-Migration.",
      );
    } finally {
      setUploading(false);
    }
  }

  const categoryId = categories.find((category) => category.slug === product?.categorySlug)?.id;
  return (
    <form action={action} className="admin-product-form">
      {product && <input type="hidden" name="id" value={product.id} />}
      <section>
        <h2>Grunddaten</h2>
        <div className="admin-form-grid">
          <label>
            Produktname
            <input name="name" defaultValue={product?.name} required />
          </label>
          <label>
            Marke
            <input name="brand" defaultValue={product?.brand} required />
          </label>
          <label>
            SKU
            <input name="sku" defaultValue={product?.sku} required />
          </label>
          <label>
            URL-Slug
            <input name="slug" defaultValue={product?.slug} pattern="[a-z0-9-]+" required />
          </label>
          <label className="wide">
            Kategorie
            <select name="categoryId" defaultValue={categoryId} required>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            Kurzbeschreibung
            <input name="shortDescription" defaultValue={product?.shortDescription} required />
          </label>
          <label className="wide">
            Beschreibung
            <textarea name="description" rows={5} defaultValue={product?.description} required />
          </label>
        </div>
      </section>
      <section>
        <h2>Preis & Einheit</h2>
        <div className="admin-form-grid four">
          <label>
            Preis inkl. MwSt.
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.price}
              required
            />
          </label>
          <label>
            Verkaufseinheit
            <input name="saleUnit" defaultValue={product?.saleUnit ?? "Stück"} required />
          </label>
          <label>
            Grundpreis
            <input
              name="basePrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.basePrice}
              required
            />
          </label>
          <label>
            Grundeinheit
            <input name="baseUnit" defaultValue={product?.baseUnit ?? "m²"} required />
          </label>
          <label>
            Basismenge
            <input
              name="baseQuantity"
              type="number"
              step="0.001"
              min="0.001"
              defaultValue={product?.baseQuantity ?? 1}
              required
            />
          </label>
          <label>
            Abdeckung m²
            <input
              name="coverage"
              type="number"
              step="0.001"
              min="0"
              defaultValue={product?.coveragePerUnit ?? ""}
            />
          </label>
          <label>
            Gewicht kg
            <input
              name="weight"
              type="number"
              step="0.001"
              min="0"
              defaultValue={product?.weightKg ?? 0}
              required
            />
          </label>
        </div>
      </section>
      <section>
        <h2>Bild & Suche</h2>
        <div className="admin-image-row">
          <div className="admin-image-preview">
            {imageUrl ? (
              <Image src={imageUrl} alt="Produktvorschau" fill sizes="220px" />
            ) : (
              <ImagePlus />
            )}
          </div>
          <div>
            <label>
              Bild-URL
              <input
                name="imageUrl"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
            </label>
            <label className="upload-button">
              <ImagePlus size={16} />{" "}
              {uploading ? "Wird hochgeladen …" : "Bild in Supabase hochladen"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                disabled={uploading}
                onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0])}
              />
            </label>
            <label>
              Suchbegriffe, kommagetrennt
              <input name="aliases" defaultValue={product?.aliases.join(", ")} />
            </label>
          </div>
        </div>
      </section>
      <section>
        <h2>Technische Daten & Bestand</h2>
        <div className="admin-form-grid">
          <label className="wide">
            Technische Daten als JSON
            <textarea
              name="specs"
              rows={6}
              defaultValue={JSON.stringify(product?.specs ?? { Eigenschaft: "Wert" }, null, 2)}
              required
            />
          </label>
          <label>
            Bestand Berlin-Mitte
            <input
              name="berlinStock"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.inventory.berlin ?? 0}
              required
            />
          </label>
          <label>
            Bestand Zentrallager
            <input
              name="warehouseStock"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.inventory.warehouse ?? 0}
              required
            />
          </label>
        </div>
      </section>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}
      <div className="admin-form-actions">
        <Link href="/admin/produkte">Abbrechen</Link>
        <button className="button primary" type="submit" disabled={pending || uploading}>
          {pending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
          {pending ? "Wird gespeichert …" : "Produkt speichern"}
        </button>
      </div>
    </form>
  );
}
