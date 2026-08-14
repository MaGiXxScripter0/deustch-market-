import { GripVertical } from "lucide-react";
import { categories, products } from "@/lib/catalog-data";
export default function AdminCategoriesPage() {
  return (
    <main>
      <div className="admin-heading">
        <div>
          <p className="kicker">STRUKTUR</p>
          <h1>Kategorien</h1>
        </div>
      </div>
      <div className="admin-category-list">
        {categories.map((category) => (
          <article key={category.id}>
            <GripVertical />
            <span className="category-number">{category.number}</span>
            <div>
              <h2>{category.name}</h2>
              <p>{category.description}</p>
            </div>
            <b>{products.filter((item) => item.categorySlug === category.slug).length} Produkte</b>
          </article>
        ))}
      </div>
    </main>
  );
}
