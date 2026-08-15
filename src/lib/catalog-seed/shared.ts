import type { Product } from "../types";

export const images = {
  drywall:
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=82",
  cement:
    "https://images.unsplash.com/photo-1542621334-a254cf47733d?auto=format&fit=crop&w=1200&q=82",
  insulation:
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=82",
  wood: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=82",
  bricks:
    "https://images.unsplash.com/photo-1625337902947-dc6f0eef6a4f?auto=format&fit=crop&w=1200&q=82",
  roof: "https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=1200&q=82",
};

export type ProductSeed = Omit<Product, "id" | "inventory" | "imageAlt"> & { stock?: [number, number] };
