"use client";

import { useActionState, useState } from "react";
import { useAdminDemoOrder } from "@/components/admin-demo-order-provider";
import {
  INITIAL_ADMIN_ORDER_ACTION_STATE,
  type AdminOrderActionState,
} from "@/lib/admin-order-action-state";
import { updateRequestStatusAction } from "@/lib/admin-order-actions";
import {
  getAllowedStatuses,
  STATUS_LABELS,
  type AdminOrderStatus,
} from "@/lib/admin-order-workflow";

type AdminOrderStatusControlProps = {
  mode: "live" | "demo";
  orderId: string;
  status: AdminOrderStatus;
  allPicked: boolean;
  compact?: boolean;
};

function StatusFields({
  status,
  allPicked,
  selected,
  setSelected,
  pending,
}: {
  status: AdminOrderStatus;
  allPicked: boolean;
  selected: AdminOrderStatus;
  setSelected: (status: AdminOrderStatus) => void;
  pending: boolean;
}) {
  return (
    <select
      name="status"
      value={selected}
      onChange={(event) => setSelected(event.target.value as AdminOrderStatus)}
      disabled={pending}
    >
      {getAllowedStatuses(status, allPicked).map((option) => (
        <option key={option} value={option}>
          {STATUS_LABELS[option]}
        </option>
      ))}
    </select>
  );
}

function LiveAdminOrderStatusControl({ orderId, status, allPicked, compact }: AdminOrderStatusControlProps) {
  const [result, formAction, pending] = useActionState(
    updateRequestStatusAction,
    INITIAL_ADMIN_ORDER_ACTION_STATE,
  );
  const [selected, setSelected] = useState(status);

  return (
    <form
      action={formAction}
      className="admin-order-status"
      data-compact={compact || undefined}
      onSubmit={(event) => {
        if (selected === "cancelled" && !window.confirm("Bestellung wirklich stornieren?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={orderId} />
      <StatusFields
        status={status}
        allPicked={allPicked}
        selected={selected}
        setSelected={setSelected}
        pending={pending}
      />
      <button type="submit" disabled={pending || selected === status}>
        {pending ? "Speichert…" : "Status speichern"}
      </button>
      <StatusFeedback result={result} />
    </form>
  );
}

function DemoAdminOrderStatusControl({ compact }: AdminOrderStatusControlProps) {
  const { allItemIds, setStatus, state } = useAdminDemoOrder();
  const [selected, setSelected] = useState(state.status);
  const [result, setResult] = useState<AdminOrderActionState>(INITIAL_ADMIN_ORDER_ACTION_STATE);
  const allPicked = allItemIds.every((itemId) => state.pickedItemIds.includes(itemId));
  const selectableStatuses = getAllowedStatuses(state.status, allPicked);
  const effectiveSelected = selectableStatuses.includes(selected) ? selected : state.status;

  return (
    <div className="admin-order-status" data-compact={compact || undefined}>
      <StatusFields
        status={state.status}
        allPicked={allPicked}
        selected={effectiveSelected}
        setSelected={setSelected}
        pending={false}
      />
      <button
        type="button"
        disabled={effectiveSelected === state.status}
        onClick={() => {
          if (
            effectiveSelected === "cancelled" &&
            !window.confirm("Bestellung wirklich stornieren?")
          ) {
            return;
          }
          setStatus(effectiveSelected);
          setResult({ status: "success", message: "Der Bestellstatus wurde gespeichert." });
        }}
      >
        Status speichern
      </button>
      <StatusFeedback result={result} />
      <p className="admin-demo-order-note">Interaktive Demo: Änderungen gelten nur für diese Browsersitzung.</p>
    </div>
  );
}

function StatusFeedback({ result }: { result: AdminOrderActionState }) {
  return result.status === "idle" ? null : <p aria-live="polite">{result.message}</p>;
}

export function AdminOrderStatusControl(props: AdminOrderStatusControlProps) {
  return props.mode === "demo" ? (
    <DemoAdminOrderStatusControl {...props} />
  ) : (
    <LiveAdminOrderStatusControl {...props} />
  );
}
