"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";
import { euro } from "@/lib/catalog";
import type { TrackedOrder } from "@/lib/order-tracking";

const statusLabels: Record<TrackedOrder["status"], string> = {
  new: "Bestellung eingegangen",
  processing: "Wird zusammengestellt",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeholt",
  cancelled: "Storniert",
};

export function OrderTrackingForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/order-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestNumber: form.get("requestNumber"),
          pickupCode: form.get("pickupCode"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrder(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tracking-layout">
      <form className="tracking-form" onSubmit={submit}>
        <label>
          Bestellnummer
          <input name="requestNumber" placeholder="ABH-2026-000123" autoCapitalize="characters" required />
        </label>
        <label>
          Abholcode
          <input name="pickupCode" placeholder="ABC123" maxLength={6} autoCapitalize="characters" required />
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}
          Status anzeigen
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {order && (
        <section className="tracking-result" aria-live="polite">
          <div>
            <span>{order.requestNumber}</span>
            <strong data-status={order.status}>{statusLabels[order.status]}</strong>
          </div>
          <p>
            Gewünschte Abholung: {order.pickupSlot
              ? new Date(order.pickupSlot).toLocaleString("de-DE")
              : "Termin wird abgestimmt"}
          </p>
          <ul>
            {order.items.map((item) => (
              <li key={`${item.sku}-${item.name}`}>
                <span>{item.quantity} {item.unit} · {item.name}</span>
                <strong>{euro.format(item.lineTotal)}</strong>
              </li>
            ))}
          </ul>
          <div className="tracking-total">
            <span>Gesamtsumme</span>
            <strong>{euro.format(order.subtotal)}</strong>
          </div>
        </section>
      )}
    </div>
  );
}
