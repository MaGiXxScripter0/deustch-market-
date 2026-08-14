"use client";

import Link from "next/link";
import { MapPin, Menu, ShoppingCart, UserRound, X } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { useCart } from "./cart-provider";
import { SearchAutocomplete } from "./search-autocomplete";

export function SiteHeader() {
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);
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
              DEMO
              <br />
              BAUSTOFFMARKT
            </span>
          </Link>
          <SearchAutocomplete />
          <nav className="header-actions" aria-label="Schnellzugriff">
            <Link href="/versand">
              <MapPin size={19} />
              <span>
                <small>Standort</small>
                {siteConfig.storeName}
              </span>
            </Link>
            <Link href="/konto">
              <UserRound size={19} />
              <span>
                <small>Mein Konto</small>Anmelden
              </span>
            </Link>
            <Link className="cart-link" href="/warenkorb">
              <ShoppingCart size={19} />
              <span>
                <small>Warenkorb</small>
                {ready ? `${count} Artikel` : "Wird geladen"}
              </span>
              {count > 0 && <b>{count}</b>}
            </Link>
          </nav>
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
        <nav className="shell category-nav" aria-label="Hauptnavigation">
          <Link className="catalog-trigger" href="/sortiment">
            Alle Sortimente
          </Link>
          <Link href="/sortiment?availability=pickup">Heute abholen</Link>
          <Link href="/sortiment?sort=featured">Unsere Empfehlungen</Link>
          <Link href="/versand">Lieferung & Abholung</Link>
        </nav>
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
              Lieferung & Abholung
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
