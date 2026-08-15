"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCart } from "./cart-provider";

export function AddToCart({
  productId,
  quantity = 1,
  compact = false,
  disabled = false,
}: {
  productId: string;
  quantity?: number;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      className={compact ? "add-button compact" : "add-button"}
      type="button"
      disabled={disabled}
      aria-label={disabled ? "Zur Abholung nicht verfügbar" : undefined}
      title={disabled ? "Zur Abholung nicht verfügbar" : undefined}
      onClick={() => {
        add(productId, quantity);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
      aria-live="polite"
    >
      {disabled ? (
        <>Nicht abholbar</>
      ) : added ? (
        <>
          <Check size={17} /> Hinzugefügt
        </>
      ) : (
        <>
          <ShoppingCart size={17} /> In den Warenkorb
        </>
      )}
    </button>
  );
}
