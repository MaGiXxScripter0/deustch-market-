import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/admin-product-form";
import { getAdminCatalogData } from "@/lib/catalog-repository";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { categories, products } = await getAdminCatalogData();
  const product = products.find((item) => item.id === id);
  if (!product) notFound();
  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">KATALOG</p>
          <h1>Produkt bearbeiten</h1>
        </div>
      </div>
      <AdminProductForm categories={categories} product={product} />
    </main>
  );
}
