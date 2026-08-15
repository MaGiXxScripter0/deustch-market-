export type CategorySearchRecord = {
  name_de: string;
  slug: string;
  description_de: string;
};

export const categoryDeletionSchema = z.object({
  id: z.guid(),
  confirmation: z.string().trim().min(1).max(120),
});

export function filterAdminCategories<T extends CategorySearchRecord>(
  query: string,
  categories: T[],
) {
  const value = query.trim().toLocaleLowerCase("de-DE");
  if (!value) return categories;

  return categories.filter((category) =>
    [category.name_de, category.slug, category.description_de].some((field) =>
      field.toLocaleLowerCase("de-DE").includes(value),
    ),
  );
}

export function isCategoryDeletionConfirmed(expectedName: string, confirmation: string) {
  return confirmation.trim() === expectedName.trim();
}
import { z } from "zod";
