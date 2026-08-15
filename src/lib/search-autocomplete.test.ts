import { describe, expect, it } from "vitest";
import { nextAutocompleteIndex } from "../components/search-autocomplete";

describe("autocomplete keyboard navigation", () => {
  it("wraps through suggestions and clears on escape", () => {
    expect(nextAutocompleteIndex(-1, 3, "ArrowDown")).toBe(0);
    expect(nextAutocompleteIndex(2, 3, "ArrowDown")).toBe(0);
    expect(nextAutocompleteIndex(-1, 3, "ArrowUp")).toBe(2);
    expect(nextAutocompleteIndex(1, 3, "Escape")).toBe(-1);
    expect(nextAutocompleteIndex(-1, 0, "ArrowDown")).toBe(-1);
  });
});
