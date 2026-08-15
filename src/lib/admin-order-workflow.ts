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

export type DemoOrderAction =
  | { type: "toggle-item"; itemId: string }
  | { type: "set-status"; status: AdminOrderStatus; allPicked?: boolean }
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
  if (!getAllowedStatuses(state.status, action.allPicked === true).includes(action.status)) return state;
  return { ...state, status: action.status };
}
