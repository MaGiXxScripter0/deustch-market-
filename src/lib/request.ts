import { z } from "zod";
import type { Product } from "./types";

export type RequestContactDefaults = {
  name: string;
  email: string;
  phone: string;
};

export function getRequestContactDefaults(input: {
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
}): RequestContactDefaults {
  return {
    name: (input.fullName ?? "").trim(),
    email: (input.email ?? "").trim(),
    phone: (input.phone ?? "").trim(),
  };
}

export const requestSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    phone: z.string().trim().min(5).max(40),
    pickupSlot: z.iso.datetime({ offset: true }),
    comment: z.string().max(1000).optional(),
    consent: z.literal(true),
    website: z.string().max(0).optional(),
    items: z
      .array(z.object({ productId: z.guid(), quantity: z.number().positive().max(999) }))
      .min(1)
      .max(100),
  })
  .superRefine((payload, context) => {
    const productIds = payload.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "Doppelte Produkte" });
    }
    const pickupSlot = new Date(payload.pickupSlot).getTime();
    const now = Date.now();
    if (pickupSlot < now + 60 * 60 * 1000 || pickupSlot > now + 31 * 24 * 60 * 60 * 1000) {
      context.addIssue({
        code: "custom",
        path: ["pickupSlot"],
        message: "Ungültiger Abholtermin",
      });
    }
  });

export type ValidRequest = z.infer<typeof requestSchema>;

export function resolveRequestLines(payload: ValidRequest, products: Product[]) {
  return payload.items.map((line) => ({
    line,
    product: products.find((product) => product.id === line.productId),
  }));
}

export function hasUnavailableLines(
  _payload: ValidRequest,
  lines: ReturnType<typeof resolveRequestLines>,
) {
  return lines.some(({ line, product }) => {
    if (!product) return true;
    return !product.inventory.pickup || product.inventory.berlin < line.quantity;
  });
}

export function calculateRequestSubtotal(lines: ReturnType<typeof resolveRequestLines>) {
  return lines.reduce(
    (sum, entry) => sum + (entry.product?.price ?? 0) * entry.line.quantity,
    0,
  );
}
