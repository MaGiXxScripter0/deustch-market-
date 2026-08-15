import { describe, expect, it } from "vitest";
import { filterAdminCategories, isCategoryDeletionConfirmed } from "./admin-category-management";

const categories = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    slug: "dach-entwaesserung",
    name_de: "Dachentwässerung",
    description_de: "Rinnen und Ablaufrohre für das Dach.",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    slug: "daemmung-folien",
    name_de: "Dämmung & Folien",
    description_de: "Wärmeschutz für Innenräume.",
  },
];

describe("admin category management", () => {
  it("searches category name, slug, and description without case sensitivity", () => {
    expect(filterAdminCategories("DACH", categories)).toEqual([categories[0]]);
    expect(filterAdminCategories("folien", categories)).toEqual([categories[1]]);
    expect(filterAdminCategories("wärmeschutz", categories)).toEqual([categories[1]]);
  });

  it("only accepts an exact category name for deletion", () => {
    expect(isCategoryDeletionConfirmed("Dämmung & Folien", "Dämmung & Folien")).toBe(true);
    expect(isCategoryDeletionConfirmed("Dämmung & Folien", "  Dämmung & Folien  ")).toBe(true);
    expect(isCategoryDeletionConfirmed("Dämmung & Folien", "dämmung & Folien")).toBe(false);
    expect(isCategoryDeletionConfirmed("Dämmung & Folien", "Dämmung  & Folien")).toBe(false);
  });
});
