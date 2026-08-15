import { ORDER_STATUS_LABELS, type PickupOrderStatus } from "@/lib/account";

const steps: Array<{ status: PickupOrderStatus; label: string }> = [
  { status: "new", label: "Eingegangen" },
  { status: "processing", label: "Wird zusammengestellt" },
  { status: "ready_for_pickup", label: "Abholbereit" },
  { status: "completed", label: "Abgeholt" },
];

export function OrderStatusTimeline({ status }: { status: PickupOrderStatus }) {
  if (status === "cancelled")
    return (
      <p className="order-timeline order-timeline-cancelled" role="status">
        <strong>{ORDER_STATUS_LABELS.cancelled}</strong>
        <span>Diese Bestellung wurde storniert.</span>
      </p>
    );
  const currentIndex = steps.findIndex((step) => step.status === status);
  return (
    <ol className="order-timeline" aria-label="Bestellfortschritt">
      {steps.map((step, index) => {
        const complete = index <= currentIndex;
        return (
          <li
            className={complete ? "is-complete" : ""}
            key={step.status}
            aria-current={step.status === status ? "step" : undefined}
          >
            <span className="order-timeline-marker" aria-hidden="true">
              {complete ? "✓" : index + 1}
            </span>
            <span>
              <strong>{step.label}</strong>
              {step.status === status && <small>Aktueller Status</small>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
