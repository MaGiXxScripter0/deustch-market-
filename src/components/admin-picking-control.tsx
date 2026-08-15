"use client";

import { useActionState, useState } from "react";
import { useAdminDemoOrder } from "@/components/admin-demo-order-provider";
import {
  INITIAL_ADMIN_ORDER_ACTION_STATE,
  type AdminOrderActionState,
} from "@/lib/admin-order-action-state";
import { setPickupItemPickedAction } from "@/lib/admin-order-actions";
import {
  canTogglePicking,
  getPickingBlockedReason,
  type AdminOrderStatus,
} from "@/lib/admin-order-workflow";

type AdminPickingControlProps = {
  mode: "live" | "demo";
  requestId: string;
  itemId: string;
  itemName: string;
  picked: boolean;
  status: AdminOrderStatus;
};

function PickingButton({
  itemName,
  picked,
  disabled,
  pending = false,
}: {
  itemName: string;
  picked: boolean;
  disabled: boolean;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      className={picked ? "picked" : undefined}
      aria-label={`${itemName}: ${picked ? "Kommissionierung aufheben" : "kommissionieren"}`}
      disabled={disabled || pending}
      style={{
        minWidth: 36,
        minHeight: 36,
        width: "auto",
        height: 36,
        padding: "0 10px",
        color: picked ? "var(--white)" : "var(--ink)",
        background: picked ? "var(--accent)" : "var(--white)",
        borderColor: picked ? "var(--accent)" : "var(--line)",
        font: "inherit",
        fontSize: "0.82rem",
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {picked ? "✓ " : ""}Kommissioniert
    </button>
  );
}

function Feedback({ result }: { result: AdminOrderActionState }) {
  return result.status === "idle" ? null : <p aria-live="polite">{result.message}</p>;
}

function LiveAdminPickingControl({ requestId, itemId, itemName, picked, status }: AdminPickingControlProps) {
  const [result, formAction, pending] = useActionState(
    setPickupItemPickedAction,
    INITIAL_ADMIN_ORDER_ACTION_STATE,
  );
  const blockedReason = getPickingBlockedReason(status);
  const disabled = !canTogglePicking(status);

  return (
    <div>
      <form action={formAction} className="pick-line-form">
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="picked" value={String(!picked)} />
        <PickingButton itemName={itemName} picked={picked} disabled={disabled} pending={pending} />
      </form>
      {blockedReason && <p>{blockedReason}</p>}
      <Feedback result={result} />
    </div>
  );
}

function DemoAdminPickingControl({ itemId, itemName }: AdminPickingControlProps) {
  const { state, toggleItem } = useAdminDemoOrder();
  const [result, setResult] = useState<AdminOrderActionState>(INITIAL_ADMIN_ORDER_ACTION_STATE);
  const picked = state.pickedItemIds.includes(itemId);
  const blockedReason = getPickingBlockedReason(state.status);
  const disabled = !canTogglePicking(state.status);

  return (
    <div>
      <form
        className="pick-line-form"
        onSubmit={(event) => {
          event.preventDefault();
          toggleItem(itemId);
          setResult({
            status: "success",
            message: picked ? "Markierung entfernt." : "Position kommissioniert.",
          });
        }}
      >
        <PickingButton itemName={itemName} picked={picked} disabled={disabled} />
      </form>
      {blockedReason && <p>{blockedReason}</p>}
      <Feedback result={result} />
    </div>
  );
}

export function AdminPickingControl(props: AdminPickingControlProps) {
  return props.mode === "demo" ? (
    <DemoAdminPickingControl {...props} />
  ) : (
    <LiveAdminPickingControl {...props} />
  );
}
