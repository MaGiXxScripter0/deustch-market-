"use client";

import { useActionState, useState } from "react";
import {
  cancelPickupOrderAction,
  reschedulePickupOrderAction,
  type AccountActionState,
} from "@/lib/account-actions";
import { canCustomerManagePickup, type PickupOrderStatus } from "@/lib/account";

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Message({ state }: { state: AccountActionState }) {
  return (
    <>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
    </>
  );
}

export function OrderSelfService({
  orderId,
  orderNumber,
  status,
  pickupSlotStart,
}: {
  orderId: string;
  orderNumber: string;
  status: PickupOrderStatus;
  pickupSlotStart: string | null;
}) {
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(
    reschedulePickupOrderAction,
    {},
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelPickupOrderAction, {});
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!canCustomerManagePickup(status)) {
    const explanation =
      status === "processing"
        ? "Die Bestellung wird bereits zusammengestellt und kann online nicht mehr geändert werden."
        : status === "ready_for_pickup"
          ? "Die Bestellung ist abholbereit und kann online nicht mehr geändert werden."
          : status === "completed"
            ? "Diese Bestellung wurde bereits abgeholt."
            : "Diese Bestellung wurde storniert.";
    return <p className="order-self-service-locked">{explanation}</p>;
  }
  return (
    <section className="order-self-service" aria-labelledby="order-self-service-heading">
      <div>
        <p className="kicker">SCHNELL ÄNDERN</p>
        <h2 id="order-self-service-heading">Abholung verwalten</h2>
        <p>Änderungen sind bis zum Beginn der Zusammenstellung möglich.</p>
      </div>
      <form className="order-reschedule-form" action={rescheduleAction}>
        <input type="hidden" name="requestId" value={orderId} />
        <label>
          Neuer Abholtermin
          <input
            name="pickupSlotStart"
            type="datetime-local"
            defaultValue={localDateTime(pickupSlotStart)}
            required
          />
        </label>
        <small>
          Wählen Sie einen Termin mindestens zwei Stunden und höchstens 31 Tage im Voraus.
        </small>
        <Message state={rescheduleState} />
        <button className="button primary" type="submit" disabled={reschedulePending}>
          {reschedulePending ? "Wird gespeichert …" : "Abholtermin speichern"}
        </button>
      </form>
      <div className="order-cancel-area">
        {!confirmCancel ? (
          <button
            className="button danger-outline"
            type="button"
            onClick={() => setConfirmCancel(true)}
          >
            Bestellung stornieren
          </button>
        ) : (
          <div className="order-cancel-confirm" role="alert">
            <p>
              Bestellung <strong>{orderNumber}</strong> wirklich stornieren?
            </p>
            <div>
              <button
                className="button secondary"
                type="button"
                onClick={() => setConfirmCancel(false)}
              >
                Abbrechen
              </button>
              <form action={cancelAction}>
                <input type="hidden" name="requestId" value={orderId} />
                <button className="button danger" type="submit" disabled={cancelPending}>
                  {cancelPending ? "Wird storniert …" : "Ja, Bestellung stornieren"}
                </button>
              </form>
            </div>
          </div>
        )}
        <Message state={cancelState} />
      </div>
    </section>
  );
}
