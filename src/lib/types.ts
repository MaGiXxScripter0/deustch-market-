export type Fulfillment = "pickup";

export type Category = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  number: string;
  filterKeys: string[];
};

export type Product = {
  id: string;
  slug: string;
  categorySlug: string | null;
  sku: string;
  brand: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  saleUnit: string;
  basePrice: number;
  baseUnit: string;
  baseQuantity: number;
  coveragePerUnit?: number;
  weightKg: number;
  image: string;
  imageAlt: string;
  featured: boolean;
  active?: boolean;
  aliases: string[];
  specs: Record<string, string | number | boolean>;
  inventory: {
    berlin: number;
    pickup: boolean;
    pickupLeadTime: string;
  };
  variantGroup?: string;
  variantLabel?: string;
};

export type CartLine = { productId: string; quantity: number };

export type RequestPayload = {
  name: string;
  email: string;
  phone: string;
  pickupSlot: string;
  comment?: string;
  consent: boolean;
  items: CartLine[];
};

export type CatalogFilters = {
  q?: string;
  category?: string;
  brands?: string[];
  availability?: Fulfillment;
  minPrice?: number;
  maxPrice?: number;
  specs?: Record<string, string[]>;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
};
