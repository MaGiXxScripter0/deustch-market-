import Link from "next/link";
import { STATUS_LABELS, type AdminOrderStatus, type AdminOrderSort } from "@/lib/admin-order-workflow";

type AdminOrderListFiltersProps = {
  q: string;
  status: AdminOrderStatus | "all";
  sort: AdminOrderSort;
};

export function AdminOrderListFilters({ q, status, sort }: AdminOrderListFiltersProps) {
  return (
    <form className="request-admin-filters" method="get">
      <input name="q" type="search" placeholder="Bestellnummer, Name oder E-Mail" defaultValue={q} />
      <select name="status" defaultValue={status} aria-label="Status filtern">
        <option value="all">Alle Status</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select name="sort" defaultValue={sort} aria-label="Sortierung">
        <option value="newest">Neueste</option>
        <option value="oldest">Älteste</option>
        <option value="highest">Höchster Betrag</option>
      </select>
      <button type="submit">Filtern</button>
      <Link href="/admin/anfragen">Zurücksetzen</Link>
    </form>
  );
}
