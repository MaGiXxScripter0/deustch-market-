"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MapPin, Menu, ShoppingCart, UserRound, X } from "lucide-react";
import { Suspense, useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { useCart } from "./cart-provider";
import { SearchAutocomplete } from "./search-autocomplete";
import { ThemeToggle } from "./theme-toggle";

export type HeaderAccountState = {
  isAuthenticated: boolean;
  displayName?: string;
};

function CategoryNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pickupIsActive = pathname === "/sortiment" && searchParams.get("availability") === "pickup";
  const recommendationsAreActive =
    pathname === "/sortiment" && searchParams.get("sort") === "featured";
  const catalogIsActive = pathname === "/sortiment" && !pickupIsActive && !recommendationsAreActive;

  const activeClass = (isActive: boolean) => (isActive ? "is-active" : undefined);
  const currentPage = (isActive: boolean) => (isActive ? "page" : undefined);

  return (
    <nav className="shell category-nav" aria-label="Hauptnavigation">
      <Link
        className={activeClass(catalogIsActive)}
        href="/sortiment"
        aria-current={currentPage(catalogIsActive)}
      >
        Alle Sortimente
      </Link>
      <Link
        className={activeClass(pickupIsActive)}
        href="/sortiment?availability=pickup"
        aria-current={currentPage(pickupIsActive)}
      >
        Abholbereit
      </Link>
      <Link
        className={activeClass(recommendationsAreActive)}
        href="/sortiment?sort=featured"
        aria-current={currentPage(recommendationsAreActive)}
      >
        Unsere Empfehlungen
      </Link>
      <Link
        className={activeClass(pathname === "/versand")}
        href="/versand"
        aria-current={currentPage(pathname === "/versand")}
      >
        Bestellung & Abholung
      </Link>
      <Link
        className={activeClass(pathname === "/bestellung")}
        href="/bestellung"
        aria-current={currentPage(pathname === "/bestellung")}
      >
        Bestellung verfolgen
      </Link>
    </nav>
  );
}

function CategoryNavigationFallback() {
  return (
    <nav className="shell category-nav" aria-label="Hauptnavigation">
      <Link href="/sortiment">Alle Sortimente</Link>
      <Link href="/sortiment?availability=pickup">Abholbereit</Link>
      <Link href="/sortiment?sort=featured">Unsere Empfehlungen</Link>
      <Link href="/versand">Bestellung & Abholung</Link>
      <Link href="/bestellung">Bestellung verfolgen</Link>
    </nav>
  );
}

export function SiteHeaderClient({ account }: { account: HeaderAccountState }) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <div className="utility-bar">
        <div className="shell utility-inner">
          <span>Für Profis & Selbermacher</span>
          <span>
            {siteConfig.openingHours} · {siteConfig.phone}
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-main">
          <Link className="wordmark" href="/" aria-label={`${siteConfig.name} Startseite`}>
            <span className="wordmark-block" aria-hidden="true">
              {siteConfig.shortName}
            </span>
            <span>
              BAUMARKT
              <br />
              NASSAUER LAND
            </span>
          </Link>
          <SearchAutocomplete />
          <nav className="header-actions" aria-label="Schnellzugriff">
            <a
              className="location-selector"
              aria-label="Abholort auf Google Maps öffnen"
              href={siteConfig.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={19} aria-hidden="true" />
              <span>
                <small>Abholung im Markt</small>
                {siteConfig.storeName}
              </span>
            </a>
            <Link href="/konto">
              <UserRound size={19} aria-hidden="true" />
              <span>
                <small>{account.displayName || "Mein Konto"}</small>
                {account.isAuthenticated ? "Angemeldet" : "Anmelden"}
              </span>
            </Link>
            <Link className="cart-link" href="/warenkorb">
              <ShoppingCart size={19} aria-hidden="true" />
              <span>
                <small>Warenkorb</small>
                {ready ? `${count} Artikel` : "Wird geladen"}
              </span>
              {count > 0 && <b>{count}</b>}
            </Link>
            <ThemeToggle />
          </nav>
          <ThemeToggle className="mobile-theme-toggle" />
          <button
            className="mobile-menu-button"
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Menü öffnen"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <Suspense fallback={<CategoryNavigationFallback />}>
          <CategoryNavigation />
        </Suspense>
        {open && (
          <nav className="mobile-nav" aria-label="Mobiles Menü">
            <Link href="/sortiment" onClick={() => setOpen(false)}>
              Alle Sortimente
            </Link>
            <Link href="/warenkorb" onClick={() => setOpen(false)}>
              Warenkorb ({count})
            </Link>
            <Link href="/konto" onClick={() => setOpen(false)}>
              Mein Konto
            </Link>
            <Link href="/versand" onClick={() => setOpen(false)}>
              Bestellung & Abholung
            </Link>
            <Link href="/bestellung" onClick={() => setOpen(false)}>
              Bestellung verfolgen
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
