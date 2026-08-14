"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { CartLine } from "@/lib/types";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "demo-baustoffmarkt-cart-v1";
const CART_EVENT = "demo-baustoffmarkt-cart-change";
const EMPTY_CART: CartLine[] = [];
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY_CART;

function readCartSnapshot() {
  if (typeof window === "undefined") return EMPTY_CART;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedLines;

  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedLines = Array.isArray(parsed)
      ? parsed.filter(
          (line): line is CartLine =>
            typeof line === "object" &&
            line !== null &&
            typeof line.productId === "string" &&
            Number.isInteger(line.quantity) &&
            line.quantity > 0,
        )
      : EMPTY_CART;
  } catch {
    cachedLines = EMPTY_CART;
  }
  return cachedLines;
}

function subscribeToCart(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CART_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CART_EVENT, callback);
  };
}

function updateStoredCart(updater: (current: CartLine[]) => CartLine[]) {
  const next = updater(readCartSnapshot());
  cachedLines = next;
  cachedRaw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  window.dispatchEvent(new Event(CART_EVENT));
}

const subscribeToHydration = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribeToCart, readCartSnapshot, () => EMPTY_CART);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const add = useCallback(
    (productId: string, quantity = 1) =>
      updateStoredCart((current) => {
        const existing = current.find((line) => line.productId === productId);
        return existing
          ? current.map((line) =>
              line.productId === productId
                ? { ...line, quantity: Math.min(999, line.quantity + quantity) }
                : line,
            )
          : [...current, { productId, quantity }];
      }),
    [],
  );
  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      updateStoredCart((current) =>
        quantity <= 0
          ? current.filter((line) => line.productId !== productId)
          : current.map((line) =>
              line.productId === productId ? { ...line, quantity: Math.min(999, quantity) } : line,
            ),
      ),
    [],
  );
  const remove = useCallback(
    (productId: string) =>
      updateStoredCart((current) => current.filter((line) => line.productId !== productId)),
    [],
  );
  const clear = useCallback(() => updateStoredCart(() => []), []);
  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      ready,
    }),
    [lines, add, setQuantity, remove, clear, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
