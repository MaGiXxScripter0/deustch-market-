import { AdminProductForm } from "@/components/admin-product-form";
import { categories } from "@/lib/catalog-data";
export default function NewProductPage() {
  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">KATALOG</p>
          <h1>Produkt anlegen</h1>
        </div>
      </div>
      <AdminProductForm categories={categories} />
    </main>
  );
}
