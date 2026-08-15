import { z } from "zod";

export const productSchema = z.object({
  id: z.guid().optional(),
  categoryId: z.union([z.guid(), z.literal("")]),
  sku: z.string().min(2).max(60),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.string().min(2).max(80),
  name: z.string().min(3).max(180),
  shortDescription: z.string().min(10).max(280),
  description: z.string().min(20).max(4000),
  price: z.coerce.number().nonnegative(),
  saleUnit: z.string().min(1).max(30),
  basePrice: z.coerce.number().nonnegative(),
  baseUnit: z.string().min(1).max(20),
  baseQuantity: z.coerce.number().positive(),
  coverage: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
  weight: z.coerce.number().nonnegative(),
  imageUrl: z.union([z.url(), z.literal("")]),
  specs: z.string(),
  aliases: z.string().optional(),
  berlinStock: z.coerce.number().nonnegative(),
});

export const productSpecsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);
