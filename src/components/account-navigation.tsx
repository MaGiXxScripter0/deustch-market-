"use client";

import Link from "next/link";
import {
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/konto", label: "Übersicht", icon: LayoutDashboard },
  { href: "/konto/anfragen", label: "Bestellungen", icon: ClipboardList },
  { href: "/konto/profil", label: "Profil", icon: UserRound },
  { href: "/konto/sicherheit", label: "Sicherheit", icon: ShieldCheck },
  { href: "/sortiment", label: "Sortiment", icon: PackageSearch },
] as const;

export function AccountNavigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="account-sidebar-nav" aria-label="Kontonavigation">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/konto" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
      {isAdmin && (
        <Link href="/admin">
          <UserRound size={16} aria-hidden="true" />
          <span>Administration</span>
        </Link>
      )}
    </nav>
  );
}
