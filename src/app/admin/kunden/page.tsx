import Link from "next/link";
import {
  ArrowUpRight,
  Crown,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; role?: string }>;

const demoProfiles = [
  {
    id: "demo",
    full_name: "Anna Beispiel",
    phone: "+49 30 000000",
    role: "customer" as const,
    created_at: new Date().toISOString(),
  },
];

function getInitials(name: string | null) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials?.toUpperCase() || "?";
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const { q: searchValue = "", role: roleValue = "all" } = await searchParams;
  const search = searchValue.trim().slice(0, 80);
  const selectedRole = roleValue === "admin" || roleValue === "customer" ? roleValue : "all";
  const auth = await getCurrentProfile();
  const enabled = auth?.profile?.role === "admin";
  const supabase = enabled ? await createClient() : null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  let profileQuery = supabase
    ?.from("profiles")
    .select("id, full_name, phone, role, created_at")
    .order("created_at", { ascending: false });

  if (profileQuery && selectedRole !== "all") {
    profileQuery = profileQuery.eq("role", selectedRole);
  }

  if (profileQuery && search) {
    const escapedSearch = search.replace(/[%_(),]/g, "");
    if (escapedSearch) {
      profileQuery = profileQuery.or(`full_name.ilike.%${escapedSearch}%,phone.ilike.%${escapedSearch}%`);
    }
  }

  const [profileResult, totalResult, adminResult, currentMonthResult, previousMonthResult, analyticsResult] =
    supabase && profileQuery
      ? await Promise.all([
          profileQuery.limit(100),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "customer")
            .gte("created_at", monthStart),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "customer")
            .gte("created_at", previousMonthStart)
            .lt("created_at", monthStart),
          supabase
            .from("profiles")
            .select("created_at")
            .eq("role", "customer")
            .gte("created_at", sixMonthsAgo)
            .limit(1000),
        ])
      : [null, null, null, null, null, null];

  const profiles =
    profileResult?.data ??
    demoProfiles.filter((profile) => {
      const matchesRole = selectedRole === "all" || profile.role === selectedRole;
      const searchableProfile = `${profile.full_name ?? ""} ${profile.phone ?? ""}`.toLocaleLowerCase("de-DE");
      return matchesRole && (!search || searchableProfile.includes(search.toLocaleLowerCase("de-DE")));
    });
  const totalAccounts = totalResult?.count ?? profiles.length;
  const adminCount = adminResult?.count ?? profiles.filter((profile) => profile.role === "admin").length;
  const newThisMonth = currentMonthResult?.count ?? profiles.filter((profile) => profile.created_at >= monthStart).length;
  const newLastMonth = previousMonthResult?.count ?? 0;
  const monthlyGrowth = newLastMonth ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : null;

  const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "short" });
  const monthlySignups = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - 4 + index, 1);
    const count =
      analyticsResult?.data?.filter((profile) => {
        const createdAt = new Date(profile.created_at);
        return createdAt >= date && createdAt < nextMonth;
      }).length ?? 0;

    return { label: monthFormatter.format(date), count };
  });
  const peakSignups = Math.max(...monthlySignups.map((month) => month.count), 1);

  return (
    <main className="py-9 text-[var(--ink)] sm:py-12">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-[var(--accent)]">KUNDENANALYSE</p>
          <h1 className="m-0 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Kunden</h1>
          <p className="mb-0 mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Kundenbasis, Wachstum und Berechtigungen auf einen Blick.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Zuletzt aktualisiert: {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(now)}
        </div>
      </header>

      {!enabled && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Vorschau mit Demodaten. Für echte Kundendaten bitte mit einem Admin-Konto anmelden.
        </div>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Kundenkennzahlen">
        <MetricCard icon={<UsersRound />} label="Kundenkonten" value={totalAccounts - adminCount} note="aktive Profile" />
        <MetricCard
          icon={<UserPlus />}
          label="Neu diesen Monat"
          value={newThisMonth}
          note={monthlyGrowth === null ? "erster Vergleichsmonat" : `${monthlyGrowth >= 0 ? "+" : ""}${monthlyGrowth}% ggü. Vormonat`}
          positive={monthlyGrowth === null || monthlyGrowth >= 0}
        />
        <MetricCard icon={<Crown />} label="Administratoren" value={adminCount} note="mit Verwaltungszugriff" />
        <MetricCard
          icon={<UserCheck />}
          label="Registrierungsquote"
          value={`${totalAccounts ? Math.round((newThisMonth / totalAccounts) * 100) : 0}%`}
          note="Anteil neuer Kunden"
        />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.7fr)]">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_1px_2px_rgb(23_32_28_/_0.03)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="m-0 text-base font-semibold">Registrierungen</h2>
              <p className="mb-0 mt-1 text-xs text-[var(--muted)]">Neue Kunden in den letzten sechs Monaten</p>
            </div>
            <span className="rounded-full bg-[#eef6f0] px-2.5 py-1 text-[11px] font-semibold text-[var(--green)]">Live</span>
          </div>
          <div className="mt-6 flex h-40 items-end gap-2 sm:gap-3" role="img" aria-label="Balkendiagramm der Kundenregistrierungen">
            {monthlySignups.map((month) => (
              <div key={month.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                <span className="text-center text-[11px] font-semibold tabular-nums text-[var(--ink)]">{month.count || "–"}</span>
                <div className="relative h-28 rounded-md bg-[#f1f4f1]">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-md bg-[var(--accent)]"
                    style={{ height: `${Math.max((month.count / peakSignups) * 100, month.count ? 10 : 0)}%` }}
                  />
                </div>
                <span className="text-center text-[10px] font-medium uppercase text-[var(--muted)]">{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-[var(--line)] bg-[var(--ink)] p-5 text-white sm:p-6">
          <p className="m-0 text-[10px] font-bold tracking-[0.16em] text-[#9fb1a8]">EMPFEHLUNG</p>
          <h2 className="mb-3 mt-4 text-xl font-semibold tracking-[-0.03em]">Kundenbindung sichtbar machen</h2>
          <p className="m-0 text-sm leading-6 text-[#b9c7c0]">
            Ergänzen Sie bei Bestellungen einen Wiederbestellungs-Status, sobald mehr Kundendaten vorliegen.
          </p>
          <Link
            className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#ff9a77] hover:text-white"
            href="/admin/anfragen"
          >
            Bestellungen ansehen <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_1px_2px_rgb(23_32_28_/_0.03)]">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="m-0 text-base font-semibold">Kundenverzeichnis</h2>
            <p className="mb-0 mt-1 text-xs text-[var(--muted)]">{profiles.length} von maximal 100 Profilen angezeigt</p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row" action="/admin/kunden">
            <label className="relative block">
              <span className="sr-only">Kunden suchen</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
              <input
                className="h-10 w-full rounded-lg border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#99a29d] focus:border-[var(--accent)] sm:w-64"
                defaultValue={search}
                name="q"
                placeholder="Name oder Telefon suchen"
                type="search"
              />
            </label>
            <label className="relative block">
              <span className="sr-only">Rolle filtern</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
              <select
                className="h-10 w-full appearance-none rounded-lg border border-[var(--line)] bg-white pl-8 pr-8 text-xs font-semibold outline-none focus:border-[var(--accent)] sm:w-36"
                defaultValue={selectedRole}
                name="role"
              >
                <option value="all">Alle Rollen</option>
                <option value="customer">Kunden</option>
                <option value="admin">Admins</option>
              </select>
            </label>
            <button className="h-10 rounded-lg bg-[var(--ink)] px-4 text-xs font-bold text-white hover:bg-[#2a3731]" type="submit">
              Filtern
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead className="bg-[#f7f8f6] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3.5 font-inherit">Kunde</th>
                <th className="px-5 py-3.5 font-inherit">Telefon</th>
                <th className="px-5 py-3.5 font-inherit">Rolle</th>
                <th className="px-5 py-3.5 font-inherit">Registriert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-sm">
              {profiles.map((profile) => (
                <tr key={profile.id} className="group hover:bg-[#fbfcfa]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8f0ea] text-[11px] font-bold text-[var(--green)]" aria-hidden="true">
                        {getInitials(profile.full_name)}
                      </span>
                      <Link
                        className="font-semibold hover:text-[var(--accent)]"
                        href={`/admin/kunden/${profile.id}`}
                        aria-label={`Kunde ${profile.full_name || "Ohne Namen"} öffnen`}
                      >
                        {profile.full_name || "Ohne Namen"}
                      </Link>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-[var(--muted)]">{profile.phone || "—"}</td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        profile.role === "admin"
                          ? "rounded-full bg-[#fff0eb] px-2.5 py-1 text-[10px] font-bold text-[#aa4324]"
                          : "rounded-full bg-[#eef6f0] px-2.5 py-1 text-[10px] font-bold text-[var(--green)]"
                      }
                    >
                      {profile.role === "admin" ? "Admin" : "Kunde"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-[var(--muted)]">{formatCompactDate(profile.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {profiles.length === 0 && (
          <div className="px-5 py-12 text-center">
            <UsersRound className="mx-auto h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
            <p className="mb-0 mt-3 text-sm font-semibold">Keine Kunden gefunden</p>
            <p className="mb-0 mt-1 text-xs text-[var(--muted)]">Passen Sie Suche oder Rollenfilter an.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  note: string;
  positive?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_1px_2px_rgb(23_32_28_/_0.03)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f2f5f2] text-[var(--green)] [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden="true">
          {icon}
        </span>
        <span className={positive === false ? "text-[11px] font-semibold text-[#aa4324]" : "text-[11px] font-semibold text-[var(--muted)]"}>
          {note}
        </span>
      </div>
      <p className="mb-0 mt-5 text-[11px] font-semibold text-[var(--muted)]">{label}</p>
      <strong className="mt-1 block text-3xl font-semibold tracking-[-0.04em] tabular-nums">{value}</strong>
    </article>
  );
}
