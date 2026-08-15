"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { type: string; label: string; meta: string; href: string };

export function nextAutocompleteIndex(
  current: number,
  itemCount: number,
  key: "ArrowDown" | "ArrowUp" | "Escape",
) {
  if (!itemCount || key === "Escape") return -1;
  if (key === "ArrowDown") return current >= itemCount - 1 ? 0 : current + 1;
  return current <= 0 ? itemCount - 1 : current - 1;
}

export function SearchAutocomplete({ initialValue = "" }: { initialValue?: string }) {
  const [query, setQuery] = useState(initialValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(
      () =>
        fetch(`/api/suggestions?q=${encodeURIComponent(query)}`, { signal: controller.signal })
          .then((response) => response.json())
          .then((data) => {
            if (currentRequest === requestId.current) {
              setItems(data.items ?? []);
              setActiveIndex(-1);
            }
          })
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
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (value.trim().length < 2) {
              setItems([]);
              setActiveIndex(-1);
            }
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Escape") {
              event.preventDefault();
              setActiveIndex(nextAutocompleteIndex(activeIndex, items.length, event.key));
              if (event.key === "Escape") setFocused(false);
            }
            if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              router.push(items[activeIndex].href);
              setFocused(false);
            }
          }}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={focused && items.length > 0}
          aria-controls="global-search-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Produkt, Kategorie oder Artikelnummer"
        />
        {query && (
          <button
            className="clear-search"
            type="button"
            aria-label="Suche leeren"
            onClick={() => {
              setQuery("");
              setItems([]);
              setActiveIndex(-1);
            }}
          >
            <X size={16} />
          </button>
        )}
        <button className="search-submit" type="submit">
          Suchen
        </button>
      </form>
      {focused && query.trim().length >= 2 && items.length > 0 && (
        <div className="suggestions" id="global-search-suggestions" role="listbox">
          {items.map((item, index) => (
            <Link
              key={`${item.type}-${item.href}`}
              href={item.href}
              id={`global-search-option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
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
