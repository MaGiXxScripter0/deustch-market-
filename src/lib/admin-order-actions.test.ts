import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INITIAL_ADMIN_ORDER_ACTION_STATE,
  mapAdminOrderError,
} from "./admin-order-action-state";

const revalidatePath = vi.fn();
const createClient = vi.fn();
const getCurrentProfile = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("./supabase/server", () => ({ createClient, getCurrentProfile }));

const { setPickupItemPickedAction, updateRequestStatusAction } = await import(
  "./admin-order-actions"
);

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const ITEM_ID = "223e4567-e89b-42d3-a456-426614174001";

function statusFormData(status: string) {
  const formData = new FormData();
  formData.set("id", REQUEST_ID);
  formData.set("status", status);
  return formData;
}

function pickingFormData(picked: "true" | "false") {
  const formData = new FormData();
  formData.set("requestId", REQUEST_ID);
  formData.set("itemId", ITEM_ID);
  formData.set("picked", picked);
  return formData;
}

function createSupabaseStub(options: {
  request?: { status: string; request_items: { quantity: number; picked_qty: number }[] } | null;
  readError?: { message: string } | null;
  rpcError?: { message: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.request ?? { status: "new", request_items: [] },
    error: options.readError ?? null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn().mockResolvedValue({ error: options.rpcError ?? null });
  return { from, rpc };
}

describe("admin order action state", () => {
  it("starts with an empty idle state", () => {
    expect(INITIAL_ADMIN_ORDER_ACTION_STATE).toEqual({ status: "idle", message: "" });
  });

  it.each([
    ["All order items must be picked first", "Kommissionieren Sie zuerst alle Positionen."],
    ["Invalid order status transition", "Dieser Statuswechsel ist nicht erlaubt."],
    [
      "Order item cannot be changed",
      "Diese Position kann im aktuellen Status nicht geändert werden.",
    ],
    ["Admin access required", "Ihre Sitzung hat keine Administratorberechtigung."],
    ["internal relation name", "Die Änderung konnte nicht gespeichert werden."],
  ])("maps %s to safe German feedback", (databaseMessage, expectedMessage) => {
    expect(mapAdminOrderError(databaseMessage)).toBe(expectedMessage);
  });
});

describe("admin order actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentProfile.mockResolvedValue({ profile: { role: "admin" } });
  });

  it("rejects malformed status input before reading the database", async () => {
    const result = await updateRequestStatusAction(INITIAL_ADMIN_ORDER_ACTION_STATE, statusFormData("nope"));

    expect(result).toEqual({ status: "error", message: "Die übermittelten Bestelldaten sind ungültig." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns an authorization error without calling Supabase", async () => {
    getCurrentProfile.mockResolvedValue({ profile: { role: "customer" } });

    const result = await updateRequestStatusAction(INITIAL_ADMIN_ORDER_ACTION_STATE, statusFormData("processing"));

    expect(result).toEqual({
      status: "error",
      message: "Ihre Sitzung hat keine Administratorberechtigung.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects an illegal transition before calling the status RPC", async () => {
    const supabase = createSupabaseStub({ request: { status: "completed", request_items: [] } });
    createClient.mockResolvedValue(supabase);

    const result = await updateRequestStatusAction(INITIAL_ADMIN_ORDER_ACTION_STATE, statusFormData("processing"));

    expect(result).toEqual({ status: "error", message: "Dieser Statuswechsel ist nicht erlaubt." });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("requires every line to be picked before ready for pickup", async () => {
    const supabase = createSupabaseStub({
      request: {
        status: "processing",
        request_items: [
          { quantity: 2, picked_qty: 2 },
          { quantity: 1, picked_qty: 0 },
        ],
      },
    });
    createClient.mockResolvedValue(supabase);

    const result = await updateRequestStatusAction(
      INITIAL_ADMIN_ORDER_ACTION_STATE,
      statusFormData("ready_for_pickup"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Kommissionieren Sie zuerst alle Positionen.",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("maps a status RPC failure without revalidating stale paths", async () => {
    const supabase = createSupabaseStub({
      rpcError: { message: "All order items must be picked first" },
    });
    createClient.mockResolvedValue(supabase);

    const result = await updateRequestStatusAction(INITIAL_ADMIN_ORDER_ACTION_STATE, statusFormData("processing"));

    expect(result).toEqual({
      status: "error",
      message: "Kommissionieren Sie zuerst alle Positionen.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports and revalidates a saved status change", async () => {
    const supabase = createSupabaseStub();
    createClient.mockResolvedValue(supabase);

    const result = await updateRequestStatusAction(INITIAL_ADMIN_ORDER_ACTION_STATE, statusFormData("processing"));

    expect(result).toEqual({ status: "success", message: "Der Bestellstatus wurde gespeichert." });
    expect(supabase.rpc).toHaveBeenCalledWith("set_pickup_order_status", {
      p_request_id: REQUEST_ID,
      p_status: "processing",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/anfragen");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/anfragen/${REQUEST_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/konto/anfragen");
  });

  it("maps a failed picking mutation and leaves cached pages untouched", async () => {
    const supabase = createSupabaseStub({ rpcError: { message: "Order item cannot be changed" } });
    createClient.mockResolvedValue(supabase);

    const result = await setPickupItemPickedAction(INITIAL_ADMIN_ORDER_ACTION_STATE, pickingFormData("true"));

    expect(result).toEqual({
      status: "error",
      message: "Diese Position kann im aktuellen Status nicht geändert werden.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports and revalidates a saved picking mutation", async () => {
    const supabase = createSupabaseStub();
    createClient.mockResolvedValue(supabase);

    const result = await setPickupItemPickedAction(INITIAL_ADMIN_ORDER_ACTION_STATE, pickingFormData("false"));

    expect(result).toEqual({ status: "success", message: "Markierung entfernt." });
    expect(supabase.rpc).toHaveBeenCalledWith("set_pickup_item_picked", {
      p_request_item_id: ITEM_ID,
      p_picked: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/anfragen/${REQUEST_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/anfragen");
  });
});
