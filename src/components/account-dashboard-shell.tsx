import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions";
import { AccountNavigation } from "./account-navigation";

export function AccountDashboardShell({
  children,
  isAdmin = false,
}: {
  children: ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <main className="shell page-main account-page">
      <div className="account-dashboard-frame">
        <aside className="account-sidebar">
          <div className="account-sidebar-brand">
            <p className="kicker">MEIN KONTO</p>
            <strong>Arbeitsbereich</strong>
          </div>
          <AccountNavigation isAdmin={isAdmin} />
          <form className="account-sidebar-signout" action={signOutAction}>
            <button type="submit">
              <LogOut size={16} aria-hidden="true" /> Abmelden
            </button>
          </form>
        </aside>
        <section className="account-dashboard-content">{children}</section>
      </div>
    </main>
  );
}
