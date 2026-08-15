export const ADMIN_ORDER_STATUSES = [
  "new",
  "processing",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export const STATUS_LABELS = {
  new: "Bestellung eingegangen",
  processing: "Wird zusammengestellt",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeholt",
  cancelled: "Storniert",
} satisfies Record<AdminOrderStatus, string>;

export type AdminOrderSort = "newest" | "oldest" | "highest";

export type AdminOrderLineProgress = {
  quantity: number;
  picked_qty: number;
};

export type AdminOrderProgress = {
  pickedQuantity: number;
  requiredQuantity: number;
  allPicked: boolean;
};

export function getAdminOrderProgress(
  items: readonly AdminOrderLineProgress[] | null | undefined,
): AdminOrderProgress {
  const normalized = items ?? [];
  const requiredQuantity = normalized.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
    0,
  );
  const pickedQuantity = normalized.reduce((sum, item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const picked = Math.max(0, Number(item.picked_qty) || 0);
    return sum + Math.min(quantity, picked);
  }, 0);
  return {
    pickedQuantity,
    requiredQuantity,
    allPicked: requiredQuantity > 0 && pickedQuantity === requiredQuantity,
  };
}

export function getNextAdminOrderAction(status: AdminOrderStatus, allPicked: boolean) {
  if (status === "new") {
    return { status: "processing" as const, label: "Kommissionierung starten" };
  }
  if (status === "processing" && allPicked) {
    return { status: "ready_for_pickup" as const, label: "Als abholbereit markieren" };
  }
  if (status === "ready_for_pickup") {
    return { status: "completed" as const, label: "Als abgeholt markieren" };
  }
  return null;
}

export function normalizeAdminOrderFilters(params: {
  q?: string;
  status?: string;
  sort?: string;
}) {
  return {
    q: (params.q ?? "").trim().slice(0, 80).replace(/[%_(),]/g, ""),
    status: ADMIN_ORDER_STATUSES.includes(params.status as AdminOrderStatus)
      ? (params.status as AdminOrderStatus)
      : "all",
    sort:
      params.sort === "oldest" || params.sort === "highest" ? params.sort : "newest",
  } as const;
}

export function getAllowedStatuses(status: AdminOrderStatus, allPicked = false): AdminOrderStatus[] {
  switch (status) {
    case "new":
      return ["new", "processing", "cancelled"];
    case "processing":
      return allPicked
        ? ["processing", "ready_for_pickup", "cancelled"]
        : ["processing", "cancelled"];
    case "ready_for_pickup":
      return ["ready_for_pickup", "completed", "cancelled"];
    case "completed":
      return ["completed"];
    case "cancelled":
      return ["cancelled"];
    default:
      return [];
  }
}

export function canTogglePicking(status: AdminOrderStatus): boolean {
  return status === "new" || status === "processing";
}

export function getPickingBlockedReason(status: AdminOrderStatus): string | null {
  switch (status) {
    case "completed":
      return "Abgeschlossene Bestellungen können nicht mehr geändert werden.";
    case "cancelled":
      return "Stornierte Bestellungen können nicht kommissioniert werden.";
    case "ready_for_pickup":
      return "Die Bestellung ist bereits abholbereit.";
    default:
      return null;
  }
}

export type DemoOrderState = {
  status: AdminOrderStatus;
  pickedItemIds: string[];
};

export type CustomerOrderSummary = {
  id: string;
  subtotal: number;
  created_at: string;
  status: AdminOrderStatus;
};

export function summarizeCustomerOrders(orders: CustomerOrderSummary[]) {
  const newest = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return {
    orderCount: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + Number(order.subtotal), 0),
    activePickupCount: orders.filter((order) =>
      ["new", "processing", "ready_for_pickup"].includes(order.status),
    ).length,
    lastOrderAt: newest?.created_at ?? null,
  };
}

export type DemoOrderAction =
  | { type: "toggle-item"; itemId: string }
  | { type: "set-status"; status: AdminOrderStatus; allItemIds: string[] }
  | { type: "hydrate"; state: DemoOrderState };

const INITIAL_STATE: DemoOrderState = { status: "new", pickedItemIds: [] };

export function demoOrderReducer(
  state: DemoOrderState = INITIAL_STATE,
  action: DemoOrderAction,
): DemoOrderState {
  if (action.type === "hydrate") {
    if (!ADMIN_ORDER_STATUSES.includes(action.state.status)) return state;
    return { status: action.state.status, pickedItemIds: [...action.state.pickedItemIds] };
  }

  if (action.type === "toggle-item") {
    if (!canTogglePicking(state.status)) return state;
    const picked = state.pickedItemIds.includes(action.itemId);
    return {
      ...state,
      pickedItemIds: picked
        ? state.pickedItemIds.filter((itemId) => itemId !== action.itemId)
        : [...state.pickedItemIds, action.itemId],
    };
  }

  if (!ADMIN_ORDER_STATUSES.includes(action.status)) return state;
  const allPicked = action.allItemIds.every((itemId) => state.pickedItemIds.includes(itemId));
  if (!getAllowedStatuses(state.status, allPicked).includes(action.status)) return state;
  return { ...state, status: action.status };
}
