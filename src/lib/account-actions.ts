"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  parseAccountEmail,
  parseOrderId,
  parsePasswordChange,
  parsePickupSlot,
} from "./account-action-validation";
import { createClient, getCurrentProfile } from "./supabase/server";
import { verifyTurnstile } from "./turnstile";

export type AccountActionState = {
  error?: string;
  success?: string;
  turnstileResetId?: string;
};

function captchaError(error: string): AccountActionState {
  return { error, turnstileResetId: crypto.randomUUID() };
}

function authError(error: unknown, fallback: string) {
  const status = typeof error === "object" && error && "status" in error ? error.status : null;
  if (status === 429) return "Zu viele Versuche. Bitte warten Sie einen Moment.";
  return fallback;
}

function accountSecurityRedirect() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/auth/confirm?next=/konto/sicherheit`;
}

export async function resendCurrentConfirmationAction(
  state: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  void state;
  void formData;
  const auth = await getCurrentProfile();
  const supabase = await createClient();
  if (!auth || !supabase) return { error: "Bitte melden Sie sich erneut an." };
  if (!auth.user.email && !auth.user.new_email)
    return { error: "Bitte melden Sie sich erneut an." };
  if (auth.user.email_confirmed_at && !auth.user.new_email)
    return { success: "Ihre E-Mail-Adresse ist bereits bestätigt." };

  const email = auth.user.new_email ?? auth.user.email;
  if (!email) return { error: "Bitte melden Sie sich erneut an." };
  const type = auth.user.new_email ? "email_change" : "signup";
  const { error } = await supabase.auth.resend({
    type,
    email,
    options: { emailRedirectTo: accountSecurityRedirect() },
  });
  if (error) return { error: authError(error, "Die E-Mail konnte nicht versendet werden.") };
  return { success: "Eine neue Bestätigungs-E-Mail wurde versendet." };
}

export async function resendSignupConfirmationAction(
  _: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = parseAccountEmail(formData.get("email"));
  if (!parsed.success)
    return captchaError(parsed.error.issues[0]?.message ?? "Ungültige E-Mail-Adresse.");
  if (
    !(await verifyTurnstile(
      formData.get("cf-turnstile-response"),
      "resend-signup",
      await headers(),
    ))
  )
    return captchaError(
      "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    );

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase ist noch nicht konfiguriert." };
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm`,
    },
  });
  return { success: "Wenn ein unbestätigtes Konto existiert, wurde eine neue E-Mail versendet." };
}

export async function changeEmailAction(
  _: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = parseAccountEmail(formData.get("email"));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Ungültige E-Mail-Adresse." };
  const auth = await getCurrentProfile();
  const supabase = await createClient();
  if (!auth || !supabase) return { error: "Bitte melden Sie sich erneut an." };
  if (parsed.data.toLowerCase() === auth.user.email?.toLowerCase())
    return { error: "Bitte geben Sie eine andere E-Mail-Adresse ein." };
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: accountSecurityRedirect() },
  );
  if (error) return { error: authError(error, "Die E-Mail-Adresse konnte nicht geändert werden.") };
  return { success: "Bitte bestätigen Sie die neue E-Mail-Adresse." };
}

export async function changePasswordAction(
  _: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = parsePasswordChange({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Passwortangaben." };
  const auth = await getCurrentProfile();
  const supabase = await createClient();
  if (!auth?.user.email || !supabase) return { error: "Bitte melden Sie sich erneut an." };
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return { error: "Das aktuelle Passwort ist nicht korrekt." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { error: authError(error, "Das Passwort konnte nicht geändert werden.") };
  return { success: "Ihr Passwort wurde geändert." };
}

function orderMutationError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error ? String(error.message) : "";
  if (message.includes("Invalid pickup slot"))
    return "Bitte wählen Sie einen Termin zwischen zwei Stunden und 31 Tagen ab jetzt.";
  return "Diese Bestellung kann nicht mehr geändert werden.";
}

export async function reschedulePickupOrderAction(
  _: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const requestId = parseOrderId(formData.get("requestId"));
  const pickupSlotStart = parsePickupSlot(formData.get("pickupSlotStart"));
  if (!requestId.success) return { error: "Ungültige Bestellung." };
  if (!pickupSlotStart) return { error: "Bitte wählen Sie einen gültigen Abholtermin." };
  const supabase = await createClient();
  if (!supabase) return { error: "Bitte melden Sie sich erneut an." };
  const { error } = await supabase.rpc("reschedule_own_pickup_order", {
    p_request_id: requestId.data,
    p_pickup_slot_start: pickupSlotStart,
  });
  if (error) return { error: orderMutationError(error) };
  revalidatePath("/konto");
  revalidatePath("/konto/anfragen");
  revalidatePath(`/konto/anfragen/${requestId.data}`);
  return { success: "Der Abholtermin wurde gespeichert." };
}

export async function cancelPickupOrderAction(
  _: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const requestId = parseOrderId(formData.get("requestId"));
  if (!requestId.success) return { error: "Ungültige Bestellung." };
  const supabase = await createClient();
  if (!supabase) return { error: "Bitte melden Sie sich erneut an." };
  const { error } = await supabase.rpc("cancel_own_pickup_order", { p_request_id: requestId.data });
  if (error) return { error: orderMutationError(error) };
  revalidatePath("/konto");
  revalidatePath("/konto/anfragen");
  revalidatePath(`/konto/anfragen/${requestId.data}`);
  return { success: "Die Bestellung wurde storniert." };
}
