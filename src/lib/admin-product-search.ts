import { searchProducts } from "./catalog";
import type { Product } from "./types";

export function filterAdminProducts(query: string, productItems: Product[]) {
  return query.trim() ? searchProducts(query, productItems) : productItems;
}
