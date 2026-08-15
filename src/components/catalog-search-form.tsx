import { Search } from "lucide-react";

export function CatalogSearchForm({
  action,
  initialValue,
}: {
  action: string;
  initialValue: string;
}) {
  return (
    <form className="catalog-toolbar-search" action={action} role="search">
      <Search size={16} aria-hidden="true" />
      <label className="sr-only" htmlFor="catalog-search">
        Produkte im Sortiment suchen
      </label>
      <input
        id="catalog-search"
        name="q"
        defaultValue={initialValue}
        placeholder="Produkte im Sortiment suchen"
      />
      <button type="submit" aria-label="Produkte suchen">
        <span className="sr-only">Suchen</span>
      </button>
    </form>
  );
}
