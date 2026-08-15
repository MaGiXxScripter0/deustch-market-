import "server-only";

import type { AccountDashboardData, AccountOrderSummary, PickupOrderStatus } from "./account";
import { isPickupOrderStatus } from "./account";
import { createClient, getCurrentProfile } from "./supabase/server";

function toStatus(value: string): PickupOrderStatus {
  return isPickupOrderStatus(value) ? value : "cancelled";
}

function mapOrder(row: {
  id: string;
  request_number: string;
  status: string;
  subtotal: number;
  created_at: string;
  pickup_slot_start: string | null;
  pickup_code: string;
  request_items: { id: string }[] | null;
}): AccountOrderSummary {
  return {
    id: row.id,
    requestNumber: row.request_number,
    status: toStatus(row.status),
    subtotal: Number(row.subtotal),
    createdAt: row.created_at,
    pickupSlotStart: row.pickup_slot_start,
    pickupCode: row.pickup_code,
    itemCount: row.request_items?.length ?? 0,
  };
}

export async function getAccountDashboard(): Promise<AccountDashboardData | null> {
  const auth = await getCurrentProfile();
  const supabase = await createClient();
  if (!auth || !supabase) return null;

  const { data } = await supabase
    .from("requests")
    .select(
      "id, request_number, status, subtotal, created_at, pickup_slot_start, pickup_code, request_items(id)",
    )
    .eq("user_id", auth.user.id)
    .eq("fulfillment", "pickup")
    .order("created_at", { ascending: false })
    .limit(10);

  const orders = (data ?? []).map((row) => mapOrder(row));
  const activeOrder =
    orders.find((order) => ["new", "processing", "ready_for_pickup"].includes(order.status)) ??
    null;
  return {
    user: {
      email: auth.user.email ?? "",
      emailConfirmedAt: auth.user.email_confirmed_at ?? null,
      pendingEmail: auth.user.new_email ?? null,
    },
    profile: {
      fullName: auth.profile?.full_name?.trim() ?? "",
      phone: auth.profile?.phone?.trim() ?? "",
      role: auth.profile?.role === "admin" ? "admin" : "customer",
    },
    activeOrder,
    recentOrders: orders.slice(0, 3),
  };
}
