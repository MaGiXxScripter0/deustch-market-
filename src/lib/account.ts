export type PickupOrderStatus =
  "new" | "processing" | "ready_for_pickup" | "completed" | "cancelled";

export type AccountOrderSummary = {
  id: string;
  requestNumber: string;
  status: PickupOrderStatus;
  subtotal: number;
  createdAt: string;
  pickupSlotStart: string | null;
  pickupCode: string;
  itemCount: number;
};

export type AccountDashboardData = {
  user: {
    email: string;
    emailConfirmedAt: string | null;
    pendingEmail: string | null;
  };
  profile: {
    fullName: string;
    phone: string;
    role: "customer" | "admin";
  };
  activeOrder: AccountOrderSummary | null;
  recentOrders: AccountOrderSummary[];
};

export const ORDER_STATUS_LABELS: Record<PickupOrderStatus, string> = {
  new: "Bestellung eingegangen",
  processing: "Wird zusammengestellt",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeholt",
  cancelled: "Storniert",
};

export function canCustomerManagePickup(status: PickupOrderStatus) {
  return status === "new";
}

export function isPickupOrderStatus(value: string): value is PickupOrderStatus {
  return Object.hasOwn(ORDER_STATUS_LABELS, value);
}

export function validatePickupSlot(value: string, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  return (
    Number.isFinite(timestamp) &&
    timestamp >= now + 2 * 60 * 60 * 1000 &&
    timestamp <= now + 31 * 24 * 60 * 60 * 1000
  );
}
