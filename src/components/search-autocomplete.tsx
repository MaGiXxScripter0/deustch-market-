"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Suggestion = { type: string; label: string; meta: string; href: string };

export function SearchAutocomplete({ initialValue = "" }: { initialValue?: string }) {
  const [query, setQuery] = useState(initialValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () =>
        fetch(`/api/suggestions?q=${encodeURIComponent(query)}`, { signal: controller.signal })
          .then((response) => response.json())
          .then((data) => setItems(data.items ?? []))
          .catch(() => {}),
      160,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  return (
    <div className="search-wrap" ref={boxRef}>
      <form className="search-box" action="/suche" role="search">
        <label className="sr-only" htmlFor="global-search">
          Produkte suchen
        </label>
        <Search size={18} aria-hidden="true" />
        <input
          id="global-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          autoComplete="off"
          placeholder="Produkt, Kategorie oder Artikelnummer"
        />
        {query && (
          <button
            className="clear-search"
            type="button"
            aria-label="Suche leeren"
            onClick={() => setQuery("")}
          >
            <X size={16} />
          </button>
        )}
        <button className="search-submit" type="submit">
          Suchen
        </button>
      </form>
      {focused && query.trim().length >= 2 && items.length > 0 && (
        <div className="suggestions" role="listbox">
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.href}`}
              href={item.href}
              onClick={() => setFocused(false)}
            >
              <span>
                <small>{item.type === "category" ? "Kategorie" : "Produkt"}</small>
                {item.label}
              </span>
              <em>{item.meta}</em>
            </Link>
          ))}
          <Link className="all-results" href={`/suche?q=${encodeURIComponent(query)}`}>
            Alle Ergebnisse für „{query}” →
          </Link>
        </div>
      )}
    </div>
  );
}
