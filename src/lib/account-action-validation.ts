import { z } from "zod";
import { validatePickupSlot } from "./account";

const emailSchema = z.email("Bitte geben Sie eine gültige E-Mail-Adresse ein.").max(254);
const passwordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8, "Das neue Passwort muss mindestens 8 Zeichen lang sein."),
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ["confirmation"],
    message: "Die neuen Passwörter stimmen nicht überein.",
  });
const orderIdSchema = z.guid("Ungültige Bestellung.");

export function parseAccountEmail(value: unknown) {
  return emailSchema.safeParse(value);
}

export function parsePasswordChange(value: unknown) {
  return passwordSchema.safeParse(value);
}

export function parseOrderId(value: unknown) {
  return orderIdSchema.safeParse(value);
}

export function parsePickupSlot(value: unknown, now = Date.now()) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || !validatePickupSlot(date.toISOString(), now)) return null;
  return date.toISOString();
}
