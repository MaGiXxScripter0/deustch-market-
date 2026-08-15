"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  mapAdminOrderError,
  type AdminOrderActionState,
} from "./admin-order-action-state";
import {
  ADMIN_ORDER_STATUSES,
  getAllowedStatuses,
  type AdminOrderStatus,
} from "./admin-order-workflow";
import { createClient, getCurrentProfile } from "./supabase/server";

const statusMutationSchema = z.object({
  id: z.uuid(),
  status: z.enum(ADMIN_ORDER_STATUSES),
});

const pickingMutationSchema = z.object({
  itemId: z.uuid(),
  requestId: z.uuid(),
  picked: z.enum(["true", "false"]),
});

function errorState(message: string): AdminOrderActionState {
  return { status: "error", message };
}

export async function updateRequestStatusAction(
  _: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  const parsed = statusMutationSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return errorState("Die übermittelten Bestelldaten sind ungültig.");

  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return errorState(mapAdminOrderError("Admin access required"));

  const supabase = await createClient();
  if (!supabase) return errorState("Die Änderung konnte nicht gespeichert werden.");

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("status, request_items(quantity, picked_qty)")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (requestError || !request || !ADMIN_ORDER_STATUSES.includes(request.status as AdminOrderStatus)) {
    return errorState("Die Änderung konnte nicht gespeichert werden.");
  }

  const allPicked = (request.request_items ?? []).every(
    (item) => Number(item.picked_qty) >= Number(item.quantity),
  );
  const allowedStatuses = getAllowedStatuses(request.status as AdminOrderStatus, allPicked);
  if (!allowedStatuses.includes(parsed.data.status)) {
    return errorState(
      mapAdminOrderError(
        parsed.data.status === "ready_for_pickup" && !allPicked
          ? "All order items must be picked first"
          : "Invalid order status transition",
      ),
    );
  }

  const { error } = await supabase.rpc("set_pickup_order_status", {
    p_request_id: parsed.data.id,
    p_status: parsed.data.status,
  });
  if (error) return errorState(mapAdminOrderError(error.message));

  revalidatePath("/admin/anfragen");
  revalidatePath(`/admin/anfragen/${parsed.data.id}`);
  revalidatePath("/konto/anfragen");
  return { status: "success", message: "Der Bestellstatus wurde gespeichert." };
}

export async function setPickupItemPickedAction(
  _: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  const parsed = pickingMutationSchema.safeParse({
    itemId: formData.get("itemId"),
    requestId: formData.get("requestId"),
    picked: formData.get("picked"),
  });
  if (!parsed.success) return errorState("Die übermittelten Bestelldaten sind ungültig.");

  const auth = await getCurrentProfile();
  if (auth?.profile?.role !== "admin") return errorState(mapAdminOrderError("Admin access required"));

  const supabase = await createClient();
  if (!supabase) return errorState("Die Änderung konnte nicht gespeichert werden.");

  const { error } = await supabase.rpc("set_pickup_item_picked", {
    p_request_item_id: parsed.data.itemId,
    p_picked: parsed.data.picked === "true",
  });
  if (error) return errorState(mapAdminOrderError(error.message));

  revalidatePath(`/admin/anfragen/${parsed.data.requestId}`);
  revalidatePath("/admin/anfragen");
  return {
    status: "success",
    message: parsed.data.picked === "true" ? "Position kommissioniert." : "Markierung entfernt.",
  };
}
