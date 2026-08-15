"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import {
  ADMIN_ORDER_STATUSES,
  demoOrderReducer,
  type AdminOrderStatus,
  type DemoOrderState,
} from "@/lib/admin-order-workflow";

export type AdminDemoOrderContextValue = {
  state: DemoOrderState;
  allItemIds: string[];
  setStatus: (status: AdminOrderStatus) => void;
  toggleItem: (itemId: string) => void;
};

type AdminDemoOrderProviderProps = {
  orderId: string;
  initialState: DemoOrderState;
  allItemIds: string[];
  children: React.ReactNode;
};

const AdminDemoOrderContext = createContext<AdminDemoOrderContextValue | null>(null);

function getStoredState(orderId: string, allItemIds: string[]): DemoOrderState | null {
  try {
    const stored = sessionStorage.getItem(`admin-demo-order:${orderId}`);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("status" in parsed) ||
      !("pickedItemIds" in parsed) ||
      !ADMIN_ORDER_STATUSES.includes(parsed.status as AdminOrderStatus) ||
      !Array.isArray(parsed.pickedItemIds) ||
      !parsed.pickedItemIds.every(
        (itemId) => typeof itemId === "string" && allItemIds.includes(itemId),
      )
    ) {
      return null;
    }

    return {
      status: parsed.status as AdminOrderStatus,
      pickedItemIds: [...parsed.pickedItemIds],
    };
  } catch {
    return null;
  }
}

export function AdminDemoOrderProvider({
  orderId,
  initialState,
  allItemIds,
  children,
}: AdminDemoOrderProviderProps) {
  const [state, dispatch] = useReducer(demoOrderReducer, initialState);
  const hydratedOrderId = useRef<string | null>(null);
  const itemIds = useMemo(() => [...allItemIds], [allItemIds]);

  useEffect(() => {
    if (hydratedOrderId.current !== orderId) {
      hydratedOrderId.current = orderId;
      const storedState = getStoredState(orderId, itemIds);
      if (storedState) dispatch({ type: "hydrate", state: storedState });
      return;
    }
    sessionStorage.setItem(`admin-demo-order:${orderId}`, JSON.stringify(state));
  }, [itemIds, orderId, state]);

  const value = useMemo<AdminDemoOrderContextValue>(
    () => ({
      state,
      allItemIds: itemIds,
      setStatus: (status) => dispatch({ type: "set-status", status, allItemIds: itemIds }),
      toggleItem: (itemId) => dispatch({ type: "toggle-item", itemId }),
    }),
    [itemIds, state],
  );

  return <AdminDemoOrderContext.Provider value={value}>{children}</AdminDemoOrderContext.Provider>;
}

export function useAdminDemoOrder(): AdminDemoOrderContextValue {
  const value = useContext(AdminDemoOrderContext);
  if (!value) throw new Error("useAdminDemoOrder must be used inside AdminDemoOrderProvider");
  return value;
}
