import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogSearchForm } from "../components/catalog-search-form";

describe("catalog search form", () => {
  it("renders a search field for the catalog route", () => {
    const html = renderToStaticMarkup(
      <CatalogSearchForm action="/sortiment" initialValue="platte" />,
    );

    expect(html).toContain('class="catalog-toolbar-search"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="platte"');
    expect(html).toContain("Produkte im Sortiment suchen");
  });
});
