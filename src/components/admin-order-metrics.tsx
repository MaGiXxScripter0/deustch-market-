"use client";

import { useAdminDemoOrder } from "@/components/admin-demo-order-provider";

type MetricKey = "new" | "processing" | "ready_for_pickup" | "completed";

type AdminOrderMetricsProps = {
  mode: "live" | "demo";
  counts: Record<MetricKey, number>;
};

const labels: Record<MetricKey, string> = {
  new: "Eingegangen",
  processing: "In Bearbeitung",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeschlossen",
};

export function AdminOrderMetrics({ mode, counts }: AdminOrderMetricsProps) {
  return mode === "demo" ? <DemoMetrics /> : <MetricCards counts={counts} />;
}

function DemoMetrics() {
  const { state } = useAdminDemoOrder();
  const counts = Object.fromEntries(
    Object.keys(labels).map((key) => [key, state.status === key ? 1 : 0]),
  ) as Record<MetricKey, number>;
  return <MetricCards counts={counts} />;
}

function MetricCards({ counts }: { counts: Record<MetricKey, number> }) {
  return (
    <div className="admin-stats" aria-label="Bestellstatus Übersicht">
      {(Object.keys(labels) as MetricKey[]).map((key) => (
        <div className="admin-stat" key={key}>
          <span>{labels[key]}</span>
          <strong>{counts[key]}</strong>
        </div>
      ))}
    </div>
  );
}
