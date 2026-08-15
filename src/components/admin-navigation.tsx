"use client";

import Link from "next/link";
import {
  Boxes,
  ChevronDown,
  FolderTree,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  UsersRound,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/produkte", label: "Produkte", icon: Boxes },
  { href: "/admin/kategorien", label: "Kategorien", icon: FolderTree },
  { href: "/admin/anfragen", label: "Abholungen", icon: MessageSquareText },
  { href: "/admin/kunden", label: "Kunden", icon: UsersRound },
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeItem =
    navigation.find(({ href }) =>
      href === "/admin" ? pathname === href : pathname.startsWith(href),
    ) ?? navigation[0];
  const ActiveIcon = activeItem.icon;

  return (
    <nav className="admin-navigation" aria-label="Administration" data-open={open}>
      <button
        className="admin-navigation-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="admin-navigation-links"
      >
        <span>
          <ActiveIcon aria-hidden="true" />
          {activeItem.label}
        </span>
        {open ? (
          <X aria-hidden="true" />
        ) : (
          <>
            <Menu aria-hidden="true" />
            <ChevronDown aria-hidden="true" />
          </>
        )}
      </button>
      <div className="admin-navigation-links" id="admin-navigation-links">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              className={active ? "is-active" : undefined}
              href={href}
              key={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
