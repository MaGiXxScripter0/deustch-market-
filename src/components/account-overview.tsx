import Link from "next/link";
import { ArrowUpRight, Clock3, FileText, MailCheck, UserRound } from "lucide-react";
import { euro } from "@/lib/catalog";
import { ORDER_STATUS_LABELS, type AccountDashboardData } from "@/lib/account";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPickup(value: string | null) {
  return value
    ? new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
    : "Termin wird abgestimmt";
}

export function AccountOverview({ data }: { data: AccountDashboardData }) {
  const { user, profile, activeOrder, recentOrders } = data;
  return (
    <>
      <section className="account-head" aria-labelledby="account-heading">
        <div>
          <p className="kicker">MEIN KONTO</p>
          <div className="account-title-row">
            <h1 id="account-heading">
              Guten Tag{profile.fullName ? `, ${profile.fullName}` : ""}.
            </h1>
            <span className="account-status">Angemeldet</span>
          </div>
          <p>{user.email}</p>
        </div>
      </section>

      <div className="account-overview-grid">
        <section className="account-panel account-identity" aria-labelledby="identity-heading">
          <div className="account-panel-heading">
            <div>
              <p className="kicker">KONTOSTATUS</p>
              <h2 id="identity-heading">Ihre Daten</h2>
            </div>
            <UserRound aria-hidden="true" />
          </div>
          <dl className="account-data-list">
            <div>
              <dt>E-Mail</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{profile.phone || "Keine Telefonnummer hinterlegt"}</dd>
            </div>
          </dl>
          <div className="account-verification">
            <MailCheck aria-hidden="true" />
            {user.pendingEmail ? (
              <p>
                <strong>Neue E-Mail wartet auf Bestätigung.</strong>
                <br />
                {user.pendingEmail}
              </p>
            ) : user.emailConfirmedAt ? (
              <p>
                <strong>E-Mail bestätigt</strong>
                <br />
                {formatDate(user.emailConfirmedAt)}
              </p>
            ) : (
              <p>
                <strong>E-Mail noch nicht bestätigt.</strong>
                <br />
                Bestätigen Sie sie für einen sicheren Zugang.
              </p>
            )}
          </div>
          <Link className="text-link" href="/konto/sicherheit">
            Sicherheit verwalten <ArrowUpRight size={15} />
          </Link>
        </section>

        <section
          className="account-panel account-active-order"
          aria-labelledby="active-order-heading"
        >
          <div className="account-panel-heading">
            <div>
              <p className="kicker">AKTIVE ABHOLUNG</p>
              <h2 id="active-order-heading">
                {activeOrder ? activeOrder.requestNumber : "Keine offene Bestellung"}
              </h2>
            </div>
            <Clock3 aria-hidden="true" />
          </div>
          {activeOrder ? (
            <>
              <p className="account-order-status" data-status={activeOrder.status}>
                {ORDER_STATUS_LABELS[activeOrder.status]}
              </p>
              <dl className="account-data-list compact">
                <div>
                  <dt>Abholtermin</dt>
                  <dd>{formatPickup(activeOrder.pickupSlotStart)}</dd>
                </div>
                <div>
                  <dt>Abholcode</dt>
                  <dd>{activeOrder.pickupCode}</dd>
                </div>
                <div>
                  <dt>Positionen</dt>
                  <dd>{activeOrder.itemCount}</dd>
                </div>
                <div>
                  <dt>Summe</dt>
                  <dd>{euro.format(activeOrder.subtotal)}</dd>
                </div>
              </dl>
              <div className="account-panel-actions">
                <Link className="button primary" href={`/konto/anfragen/${activeOrder.id}`}>
                  Bestellung öffnen <ArrowUpRight size={16} />
                </Link>
                {activeOrder.status === "new" && (
                  <span className="account-hint">Termin bis 2 Stunden vor Abholung änderbar.</span>
                )}
              </div>
            </>
          ) : (
            <div className="account-empty-state">
              <p>Ihre abgeschlossenen Bestellungen finden Sie in der Historie.</p>
              <Link className="button secondary" href="/sortiment">
                Zum Sortiment
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="account-support-grid">
        <section
          className="account-panel account-recent-orders"
          aria-labelledby="recent-orders-heading"
        >
          <div className="account-panel-heading">
            <div>
              <p className="kicker">VERLAUF</p>
              <h2 id="recent-orders-heading">Letzte Bestellungen</h2>
            </div>
            <FileText aria-hidden="true" />
          </div>
          {recentOrders.length ? (
            <div className="account-order-list">
              {recentOrders.map((order) => (
                <Link
                  className="account-order-row"
                  key={order.id}
                  href={`/konto/anfragen/${order.id}`}
                >
                  <span>
                    <strong>{order.requestNumber}</strong>
                    <small>{formatDate(order.createdAt)}</small>
                  </span>
                  <span data-status={order.status}>{ORDER_STATUS_LABELS[order.status]}</span>
                  <strong>{euro.format(order.subtotal)}</strong>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="account-muted">Noch keine gespeicherten Bestellungen.</p>
          )}
          <Link className="text-link" href="/konto/anfragen">
            Alle Bestellungen <ArrowUpRight size={15} />
          </Link>
        </section>
      </section>
    </>
  );
}
