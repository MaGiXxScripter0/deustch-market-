import { Plus } from "lucide-react";
import { AdminCategoryForm, type AdminCategoryRecord } from "@/components/admin-category-form";
import { AdminCategoryCatalog } from "@/components/admin-category-catalog";
import { categories as fallbackCategories } from "@/lib/catalog-data";
import { getAdminCatalogData } from "@/lib/catalog-repository";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const { products } = await getAdminCatalogData();
  const supabase = enabled ? await createClient() : null;
  const result = supabase
    ? await supabase
        .from("categories")
        .select(
          "id, slug, name_de, description_de, image_path, sort_order, filter_config, is_active",
        )
        .order("sort_order")
    : { data: null };
  const categories: AdminCategoryRecord[] = result.data?.length
    ? (result.data as AdminCategoryRecord[])
    : fallbackCategories.map((category, index) => ({
        id: category.id,
        slug: category.slug,
        name_de: category.name,
        description_de: category.description,
        image_path: null,
        sort_order: index + 1,
        filter_config: category.filterKeys,
        is_active: true,
      }));
  const productCounts = products.reduce<Record<string, number>>((counts, product) => {
    if (product.categorySlug)
      counts[product.categorySlug] = (counts[product.categorySlug] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">STRUKTUR</p>
          <h1>Kategorien</h1>
        </div>
      </div>
      {!enabled && (
        <div className="admin-warning">Vorschaumodus: Änderungen erfordern ein Admin-Konto.</div>
      )}
      <details className="admin-create-category">
        <summary>
          <Plus size={16} /> Kategorie anlegen
        </summary>
        <AdminCategoryForm enabled={enabled} nextOrder={categories.length + 1} />
      </details>
      <AdminCategoryCatalog
        categories={categories}
        enabled={enabled}
        productCounts={productCounts}
      />
    </main>
  );
}
