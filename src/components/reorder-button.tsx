"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCart } from "./cart-provider";

type ReorderLine = { productId: string; quantity: number };

export function ReorderButton({ lines }: { lines: ReorderLine[] }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  if (!lines.length) return null;
  return (
    <button
      className="button primary"
      type="button"
      onClick={() => {
        lines.forEach((line) => add(line.productId, line.quantity));
        setAdded(true);
      }}
    >
      {added ? <Check size={17} /> : <ShoppingCart size={17} />}
      {added ? "Zum Warenkorb hinzugefügt" : "Erneut bestellen"}
    </button>
  );
}
