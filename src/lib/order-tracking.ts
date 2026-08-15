import { z } from "zod";

export const orderTrackingSchema = z.object({
  requestNumber: z.string().trim().toUpperCase().regex(/^ABH-\d{4}-\d{6}$/),
  pickupCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/),
});

export const trackedOrderSchema = z.object({
  requestNumber: z.string(),
  status: z.enum(["new", "processing", "ready_for_pickup", "completed", "cancelled"]),
  subtotal: z.coerce.number(),
  pickupSlot: z.string().nullable(),
  pickupCode: z.string(),
  items: z.array(
    z.object({
      sku: z.string(),
      name: z.string(),
      unit: z.string(),
      quantity: z.coerce.number(),
      lineTotal: z.coerce.number(),
    }),
  ),
});

export type TrackedOrder = z.infer<typeof trackedOrderSchema>;
