"use client";

import { MapPin } from "lucide-react";
import { useSyncExternalStore } from "react";
import { siteConfig } from "@/lib/site-config";

const STORAGE_KEY = "demo-baustoffmarkt-location";
const EVENT_NAME = "demo-baustoffmarkt-location-change";
export const DEFAULT_LOCATION = siteConfig.pickupLocationSlug;

export const storeLocations = [
  { slug: siteConfig.pickupLocationSlug, label: siteConfig.storeName },
  { slug: "zentrallager", label: "Zentrallager" },
] as const;

export type SelectedLocation = (typeof storeLocations)[number]["slug"];

function getLocation(): SelectedLocation {
  if (typeof window === "undefined") return DEFAULT_LOCATION;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return storeLocations.some((location) => location.slug === stored)
    ? (stored as SelectedLocation)
    : DEFAULT_LOCATION;
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, callback);
  };
}

export function LocationSelector() {
  const location = useSelectedLocation();

  function changeLocation(value: string) {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(EVENT_NAME));
  }

  return (
    <label className="location-selector">
      <MapPin size={19} aria-hidden="true" />
      <span>
        <small>Standort</small>
        <select
          aria-label="Standort auswählen"
          value={location}
          onChange={(event) => changeLocation(event.target.value)}
        >
          {storeLocations.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export function useSelectedLocation() {
  return useSyncExternalStore(subscribe, getLocation, () => DEFAULT_LOCATION);
}
