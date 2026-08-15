import { describe, expect, it } from "vitest";
import {
  ADMIN_ORDER_STATUSES,
  STATUS_LABELS,
  canTogglePicking,
  demoOrderReducer,
  getAllowedStatuses,
  getPickingBlockedReason,
} from "./admin-order-workflow";

describe("admin order workflow", () => {
  it("defines the canonical statuses and labels", () => {
    expect(ADMIN_ORDER_STATUSES).toEqual([
      "new",
      "processing",
      "ready_for_pickup",
      "completed",
      "cancelled",
    ]);
    expect(STATUS_LABELS.ready_for_pickup).toBe("Abholbereit");
  });

  it("returns status transitions with the processing readiness guard", () => {
    expect(getAllowedStatuses("new")).toEqual(["new", "processing", "cancelled"]);
    expect(getAllowedStatuses("processing")).toEqual([
      "processing",
      "ready_for_pickup",
      "cancelled",
    ]);
    expect(getAllowedStatuses("processing", false)).toEqual(["processing", "cancelled"]);
    expect(getAllowedStatuses("completed")).toEqual(["completed"]);
  });

  it("explains when picking cannot be changed", () => {
    expect(canTogglePicking("new")).toBe(true);
    expect(canTogglePicking("processing")).toBe(true);
    expect(canTogglePicking("ready_for_pickup")).toBe(false);
    expect(getPickingBlockedReason("completed")).toBe(
      "Abgeschlossene Bestellungen können nicht mehr geändert werden.",
    );
    expect(getPickingBlockedReason("cancelled")).toBe(
      "Stornierte Bestellungen können nicht kommissioniert werden.",
    );
    expect(getPickingBlockedReason("ready_for_pickup")).toBe(
      "Die Bestellung ist bereits abholbereit.",
    );
    expect(getPickingBlockedReason("new")).toBeNull();
  });

  it("toggles picked items only while picking is allowed", () => {
    const initial = demoOrderReducer(undefined, { type: "toggle-item", itemId: "line-1" });
    expect(initial).toEqual({ status: "new", pickedItemIds: ["line-1"] });
    expect(demoOrderReducer(initial, { type: "toggle-item", itemId: "line-1" })).toEqual({
      status: "new",
      pickedItemIds: [],
    });
    const processing = demoOrderReducer(initial, { type: "set-status", status: "processing" });
    const ready = demoOrderReducer(processing, {
      type: "set-status",
      status: "ready_for_pickup",
      allPicked: true,
    });
    const completed = demoOrderReducer(ready, { type: "set-status", status: "completed" });
    expect(demoOrderReducer(completed, { type: "toggle-item", itemId: "line-2" })).toEqual(
      completed,
    );
  });

  it("rejects illegal status transitions and hydrates state", () => {
    const processing = demoOrderReducer(undefined, { type: "set-status", status: "processing" });
    expect(processing.status).toBe("processing");
    expect(
      demoOrderReducer(processing, {
        type: "set-status",
        status: "ready_for_pickup",
        allPicked: false,
      }),
    ).toEqual(processing);
    expect(
      demoOrderReducer(processing, {
        type: "set-status",
        status: "ready_for_pickup",
        allPicked: true,
      }),
    ).toEqual({ status: "ready_for_pickup", pickedItemIds: [] });
    expect(
      demoOrderReducer(undefined, {
        type: "hydrate",
        state: { status: "processing", pickedItemIds: ["line-2"] },
      }),
    ).toEqual({ status: "processing", pickedItemIds: ["line-2"] });
  });
});
