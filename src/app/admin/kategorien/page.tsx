import { GripVertical, Plus } from "lucide-react";
import {
  AdminCategoryForm,
  type AdminCategoryRecord,
} from "@/components/admin-category-form";
import { toggleCategoryAction } from "@/lib/actions";
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
      <div className="admin-category-list editable">
        {categories.map((category) => (
          <details key={category.id}>
            <summary>
              <GripVertical />
              <span className="category-number">{String(category.sort_order).padStart(2, "0")}</span>
              <div>
                <h2>{category.name_de}</h2>
                <p>{category.description_de}</p>
              </div>
              <b>
                {products.filter((item) => item.categorySlug === category.slug).length} Produkte ·{" "}
                {category.is_active ? "Aktiv" : "Ausgeblendet"}
              </b>
            </summary>
            <div className="px-5 pb-2">
              <AdminCategoryForm category={category} enabled={enabled} />
            </div>
            <form action={toggleCategoryAction} className="category-toggle-form">
              <input type="hidden" name="id" value={category.id} />
              <input type="hidden" name="active" value={String(!category.is_active)} />
              <button type="submit" disabled={!enabled}>
                {category.is_active ? "Kategorie ausblenden" : "Kategorie aktivieren"}
              </button>
            </form>
          </details>
        ))}
      </div>
    </main>
  );
}
