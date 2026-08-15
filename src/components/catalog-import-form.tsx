"use client";

import { useActionState } from "react";
import { importCatalogAction, type CatalogImportState } from "@/lib/actions";

const initialState: CatalogImportState = {};

export function CatalogImportForm() {
  const [state, action, pending] = useActionState(importCatalogAction, initialState);
  return (
    <form action={action} className="catalog-import-form">
      <label>
        CSV-Datei
        <input name="catalog" type="file" accept=".csv,text/csv" required />
      </label>
      <p>
        UTF-8, Semikolon als Trennzeichen, maximal 500 Positionen und 5 MB pro Import. Bestehende
        Artikel werden über ihre SKU aktualisiert.
      </p>
      {state.success && <p className="admin-form-success" role="status">{state.success}</p>}
      {state.error && <p className="admin-form-error" role="alert">{state.error}</p>}
      {state.errors && (
        <ul className="catalog-import-errors" role="alert">
          {state.errors.slice(0, 12).map((error) => (
            <li key={error}>{error}</li>
          ))}
          {state.errors.length > 12 && <li>… und {state.errors.length - 12} weitere Fehler.</li>}
        </ul>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Import läuft …" : "Katalog importieren"}
      </button>
    </form>
  );
}
