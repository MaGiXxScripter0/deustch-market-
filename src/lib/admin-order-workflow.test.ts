import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_ORDER_STATUSES,
  STATUS_LABELS,
  canTogglePicking,
  demoOrderReducer,
  getAllowedStatuses,
  getAdminOrderProgress,
  getNextAdminOrderAction,
  getPickingBlockedReason,
  normalizeAdminOrderFilters,
  summarizeCustomerOrders,
} from "./admin-order-workflow";

describe("admin order workflow", () => {
  it("ships the protected pickup authorization migration", () => {
    const migrationsDirectory = resolve("supabase/migrations");
    const migrationName = readdirSync(migrationsDirectory)
      .sort()
      .reverse()
      .find((name) => {
        if (!name.endsWith("_fix_admin_pickup_workflow.sql")) return false;
        const candidate = readFileSync(resolve(migrationsDirectory, name), "utf8");
        return (
          candidate.includes("create or replace function public.set_pickup_order_status") &&
          candidate.includes("revoke execute on function public.set_pickup_order_status") &&
          candidate.includes("revoke execute on function public.set_pickup_item_picked")
        );
      });
    const sql = migrationName
      ? readFileSync(resolve(migrationsDirectory, migrationName), "utf8")
      : "";

    expect(migrationName).toBeDefined();
    expect(sql).toContain("private.is_admin()");
    expect(sql).not.toContain("public.is_admin()");
    expect(sql).toContain("revoke execute on function public.set_pickup_order_status");
    expect(sql).toContain("revoke execute on function public.set_pickup_item_picked");
  });

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
    expect(getAllowedStatuses("processing", true)).toEqual([
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
    const processing = demoOrderReducer(initial, {
      type: "set-status",
      status: "processing",
      allItemIds: ["line-1"],
    });
    const ready = demoOrderReducer(processing, {
      type: "set-status",
      status: "ready_for_pickup",
      allItemIds: ["line-1"],
    });
    const completed = demoOrderReducer(ready, {
      type: "set-status",
      status: "completed",
      allItemIds: ["line-1"],
    });
    expect(demoOrderReducer(completed, { type: "toggle-item", itemId: "line-2" })).toEqual(
      completed,
    );
  });

  it("rejects illegal status transitions and hydrates state", () => {
    const processing = demoOrderReducer(undefined, {
      type: "set-status",
      status: "processing",
      allItemIds: ["line-1"],
    });
    expect(processing.status).toBe("processing");
    expect(
      demoOrderReducer(processing, {
        type: "set-status",
        status: "ready_for_pickup",
        allItemIds: ["line-1"],
      }),
    ).toEqual(processing);
    expect(
      demoOrderReducer(processing, {
        type: "set-status",
        status: "ready_for_pickup",
        allItemIds: [],
      }),
    ).toEqual({ status: "ready_for_pickup", pickedItemIds: [] });
    expect(
      demoOrderReducer(undefined, {
        type: "hydrate",
        state: { status: "processing", pickedItemIds: ["line-2"] },
      }),
    ).toEqual({ status: "processing", pickedItemIds: ["line-2"] });
  });

  it("does not allow a ready status before a listed item is picked", () => {
    const processing = demoOrderReducer(undefined, {
      type: "set-status",
      status: "processing",
      allItemIds: ["line-1"],
    });
    expect(
      demoOrderReducer(processing, {
        type: "set-status",
        status: "ready_for_pickup",
        allItemIds: ["line-1"],
      }),
    ).toEqual(processing);
  });

  it("requires every demo line before it becomes ready for pickup", () => {
    const allItemIds = ["demo-line-1", "demo-line-2"];
    const processing = demoOrderReducer(undefined, {
      type: "set-status",
      status: "processing",
      allItemIds,
    });
    const firstPicked = demoOrderReducer(processing, {
      type: "toggle-item",
      itemId: "demo-line-1",
    });

    expect(
      demoOrderReducer(firstPicked, {
        type: "set-status",
        status: "ready_for_pickup",
        allItemIds,
      }),
    ).toEqual(firstPicked);

    const allPicked = demoOrderReducer(firstPicked, {
      type: "toggle-item",
      itemId: "demo-line-2",
    });
    expect(
      demoOrderReducer(allPicked, {
        type: "set-status",
        status: "ready_for_pickup",
        allItemIds,
      }).status,
    ).toBe("ready_for_pickup");
  });

  it("rejects malformed hydrated statuses", () => {
    const current = { status: "processing" as const, pickedItemIds: ["line-1"] };
    expect(
      demoOrderReducer(current, {
        type: "hydrate",
        state: { status: "unknown", pickedItemIds: [] },
      } as never),
    ).toEqual(current);
  });

  it("normalizes safe list filters", () => {
    expect(
      normalizeAdminOrderFilters({
        q: "  ABH_%(2026),123  ",
        status: "processing",
        sort: "oldest",
      }),
    ).toEqual({ q: "ABH2026123", status: "processing", sort: "oldest" });
    expect(normalizeAdminOrderFilters({ q: "x".repeat(100), status: "invalid", sort: "nope" })).toEqual({
      q: "x".repeat(80),
      status: "all",
      sort: "newest",
    });
  });

  it("summarizes empty and mixed customer orders", () => {
    expect(summarizeCustomerOrders([])).toEqual({
      orderCount: 0,
      totalSpent: 0,
      activePickupCount: 0,
      lastOrderAt: null,
    });
    expect(
      summarizeCustomerOrders([
        { id: "1", subtotal: 20, created_at: "2026-01-01", status: "completed" },
        { id: "2", subtotal: 30, created_at: "2026-02-01", status: "processing" },
        { id: "3", subtotal: 10, created_at: "2026-03-01", status: "cancelled" },
      ]),
    ).toEqual({ orderCount: 3, totalSpent: 60, activePickupCount: 1, lastOrderAt: "2026-03-01" });
  });

  it("sums quantities rather than only counting picked lines", () => {
    expect(
      getAdminOrderProgress([
        { quantity: 2, picked_qty: 1 },
        { quantity: 3, picked_qty: 8 },
      ]),
    ).toEqual({ pickedQuantity: 4, requiredQuantity: 5, allPicked: false });
  });

  it("uses zero progress for an empty order and does not mark it ready", () => {
    expect(getAdminOrderProgress([])).toEqual({
      pickedQuantity: 0,
      requiredQuantity: 0,
      allPicked: false,
    });
  });

  it("provides only the operational next action", () => {
    expect(getNextAdminOrderAction("new", false)).toEqual({
      status: "processing",
      label: "Kommissionierung starten",
    });
    expect(getNextAdminOrderAction("processing", false)).toBeNull();
    expect(getNextAdminOrderAction("processing", true)).toEqual({
      status: "ready_for_pickup",
      label: "Als abholbereit markieren",
    });
    expect(getNextAdminOrderAction("ready_for_pickup", true)).toEqual({
      status: "completed",
      label: "Als abgeholt markieren",
    });
  });
});
