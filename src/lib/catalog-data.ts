import type { Product } from "./types";
export { categories } from "./catalog-seed/categories";
import { coreProductSeeds } from "./catalog-seed/products-core";
import { structureProductSeeds } from "./catalog-seed/products-structure";

const seeds = [...coreProductSeeds, ...structureProductSeeds];

export const products: Product[] = seeds.map((seed, index) => {
  const { stock = [20], ...product } = seed;
  return {
    ...product,
    id: `20000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
    imageAlt: `${product.name} – Produktabbildung`,
    inventory: {
      berlin: stock[0],
      pickup: stock[0] > 0,
      pickupLeadTime: stock[0] > 0 ? "Abholbereit in 2 Stunden" : "Abholung auf Anfrage",
    },
  };
});
