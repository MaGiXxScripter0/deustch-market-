import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  PackageCheck,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { products } from "@/lib/catalog-data";
import { euro } from "@/lib/catalog";
import { getAdminCatalogData } from "@/lib/catalog-repository";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

type PickupOrder = {
  id: string;
  request_number: string;
  customer_name: string;
  subtotal: number;
  status: string;
  created_at: string;
};

const demoOrders: PickupOrder[] = [
  {
    id: "demo-pickup",
    request_number: "ABH-2026-000123",
    customer_name: "Anna Beispiel",
    subtotal: 248.4,
    status: "new",
    created_at: new Date().toISOString(),
  },
];

const statusLabel: Record<string, string> = {
  new: "Neu eingegangen",
  processing: "In Kommissionierung",
  ready_for_pickup: "Abholbereit",
  completed: "Abgeholt",
  cancelled: "Storniert",
};

function shortDay(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date).replace(".", "");
}

export default async function AdminPage() {
  const auth = await getCurrentProfile();
  const isAdmin = auth?.profile?.role === "admin";
  const [catalog, supabase] = await Promise.all([
    isAdmin ? getAdminCatalogData() : Promise.resolve({ products }),
    isAdmin ? createClient() : Promise.resolve(null),
  ]);

  let newOrderCount = 0;
  let customerCount = 0;
  let orderRows: PickupOrder[] = [];

  if (supabase) {
    const [newOrders, customers, recentOrders] = await Promise.all([
      supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      supabase
        .from("requests")
        .select("id, request_number, customer_name, subtotal, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    newOrderCount = newOrders.count ?? 0;
    customerCount = customers.count ?? 0;
    orderRows = (recentOrders.data ?? []).map((order) => ({ ...order, subtotal: Number(order.subtotal) }));
  }

  const recentOrders = orderRows.length ? orderRows : demoOrders;
  const currentProducts = catalog.products;
  const availableProducts = currentProducts.filter((product) => product.active !== false).length;
  const pickupStock = currentProducts.reduce((sum, item) => sum + item.inventory.berlin, 0);
  const queuedOrders = newOrderCount || recentOrders.filter((order) => order.status === "new").length;
  const totalCustomers = customerCount || (isAdmin ? 0 : 1);

  const weeklyOrders = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - 6 + index);
    const followingDay = new Date(day);
    followingDay.setDate(day.getDate() + 1);
    const count = recentOrders.filter((order) => {
      const createdAt = new Date(order.created_at);
      return createdAt >= day && createdAt < followingDay;
    }).length;
    return { label: shortDay(day), count };
  });
  const peakOrders = Math.max(...weeklyOrders.map((day) => day.count), 1);

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-hero">
        <div>
          <p className="kicker">ABHOLZENTRUM</p>
          <h1>Guten Morgen{auth?.profile?.full_name ? `, ${auth.profile.full_name.split(" ")[0]}` : ""}.</h1>
          <p>Behalte Bestand und Abholaufträge von {siteConfig.storeName} im Blick.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="button primary" href="/admin/anfragen">
            Abholungen öffnen <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </header>

      {!isAdmin && (
        <div className="admin-warning">
          <CircleAlert aria-hidden="true" /> Vorschau mit Demodaten. Melde dich mit einem Admin-Konto an, um live zu arbeiten.
        </div>
      )}

      <section className="admin-stats admin-metric-grid" aria-label="Kennzahlen">
        <MetricCard icon={<Boxes />} label="Aktive Produkte" value={availableProducts} detail="im Online-Katalog" trend="Katalog aktuell" />
        <MetricCard icon={<PackageCheck />} label="Abholbestand" value={pickupStock} detail="Artikel in Nassau" trend={pickupStock ? "Bestand erfasst" : "Bestand prüfen"} warning={!pickupStock} />
        <MetricCard icon={<ClipboardList />} label="Offene Abholungen" value={queuedOrders} detail="brauchen Bearbeitung" trend={queuedOrders ? "Jetzt priorisieren" : "Alles erledigt"} warning={Boolean(queuedOrders)} />
        <MetricCard icon={<UsersRound />} label="Kundenkonten" value={totalCustomers} detail="registrierte Kunden" trend="Kundenbasis" />
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-card admin-order-chart">
          <div className="admin-card-heading">
            <div><span>AUFTRAGSVOLUMEN</span><h2>Abholungen diese Woche</h2></div>
            <b>{recentOrders.length}<small> Aufträge</small></b>
          </div>
          <div className="admin-chart-bars" role="img" aria-label="Abholaufträge der vergangenen sieben Tage">
            {weeklyOrders.map((day, index) => (
              <div className="admin-chart-column" key={`${day.label}-${index}`}>
                <span>{day.count || "–"}</span>
                <div><i style={{ height: `${Math.max((day.count / peakOrders) * 100, day.count ? 12 : 0)}%` }} /></div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card admin-pickup-focus">
          <div className="admin-card-heading">
            <div><span>ABHOLBEREITSCHAFT</span><h2>Dein nächster Schritt</h2></div>
            <CalendarClock aria-hidden="true" />
          </div>
          <div className="admin-pickup-focus-number">{queuedOrders}</div>
          <p>{queuedOrders ? "Aufträge warten auf die Kommissionierung." : "Keine Aufträge in der Warteschlange."}</p>
          <Link href="/admin/anfragen">Kommissionierung öffnen <ChevronRight aria-hidden="true" /></Link>
        </article>
      </section>

      <section className="admin-workspace-grid">
        <article className="admin-card admin-queue-card">
          <div className="admin-card-heading admin-card-heading-inline">
            <div><span>AKTUELLE WARTESCHLANGE</span><h2>Letzte Abholaufträge</h2></div>
            <Link href="/admin/anfragen">Alle anzeigen <ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="admin-queue-list">
            {recentOrders.slice(0, 4).map((order) => (
              <Link href={`/admin/anfragen/${order.id}`} key={order.id}>
                <span className={`pickup-status status-${order.status}`}>{statusLabel[order.status] ?? order.status}</span>
                <div><b>{order.customer_name}</b><small>{order.request_number}</small></div>
                <strong>{euro.format(order.subtotal)}</strong>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </article>

        <article className="admin-card admin-shortcuts-card">
          <div className="admin-card-heading"><div><span>SCHNELLZUGRIFF</span><h2>Arbeite fokussiert</h2></div></div>
          <div className="admin-shortcuts">
            <Link href="/admin/produkte"><ShoppingBag aria-hidden="true" /> Produktbestand prüfen <ArrowRight aria-hidden="true" /></Link>
            <Link href="/admin/anfragen"><ClipboardList aria-hidden="true" /> Abholungen zusammenstellen <ArrowRight aria-hidden="true" /></Link>
            <Link href="/admin/kategorien"><CheckCircle2 aria-hidden="true" /> Sortiment strukturieren <ArrowRight aria-hidden="true" /></Link>
          </div>
        </article>
      </section>
    </main>
  );
}

function MetricCard({ icon, label, value, detail, trend, warning = false }: { icon: React.ReactNode; label: string; value: number; detail: string; trend: string; warning?: boolean }) {
  return (
    <article className={warning ? "admin-metric-card is-warning" : "admin-metric-card"}>
      <div className="admin-metric-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
      <p>{trend}</p>
    </article>
  );
}
