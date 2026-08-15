"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";
import { saveCategoryAction } from "@/lib/actions";

export type AdminCategoryRecord = {
  id: string;
  slug: string;
  name_de: string;
  description_de: string;
  image_path: string | null;
  sort_order: number;
  filter_config: unknown;
  is_active: boolean;
};

export function AdminCategoryForm({
  category,
  enabled,
  nextOrder = 1,
}: {
  category?: AdminCategoryRecord;
  enabled: boolean;
  nextOrder?: number;
}) {
  const [state, action, pending] = useActionState(saveCategoryAction, {});
  const filters = Array.isArray(category?.filter_config)
    ? category.filter_config.filter((filter) => typeof filter === "string").join(", ")
    : "";
  const labelClass = "grid gap-2 text-[10px] font-bold text-[var(--muted)]";
  const inputClass =
    "w-full border border-[var(--line)] bg-[var(--white)] px-3 py-2.5 font-inherit";

  return (
    <form
      action={action}
      className="mt-4 grid grid-cols-1 gap-4 border-t border-[var(--line)] pt-5 md:grid-cols-[1fr_1fr_130px]"
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <label className={labelClass}>
        Name
        <input className={inputClass} name="name" defaultValue={category?.name_de} required />
      </label>
      <label className={labelClass}>
        URL-Slug
        <input
          className={inputClass}
          name="slug"
          pattern="[a-z0-9-]+"
          defaultValue={category?.slug}
          required
        />
      </label>
      <label className={labelClass}>
        Reihenfolge
        <input
          className={inputClass}
          name="sortOrder"
          type="number"
          min="0"
          defaultValue={category?.sort_order ?? nextOrder}
          required
        />
      </label>
      <label className={`${labelClass} md:col-span-3`}>
        Beschreibung
        <textarea
          className={inputClass}
          name="description"
          rows={3}
          defaultValue={category?.description_de}
          required
        />
      </label>
      <label className={`${labelClass} md:col-span-3`}>
        Filter, kommagetrennt
        <input
          className={inputClass}
          name="filters"
          defaultValue={filters}
          placeholder="Stärke, Material, Format"
        />
      </label>
      <label className={`${labelClass} md:col-span-3`}>
        Bild-URL (optional)
        <input
          className={inputClass}
          name="imageUrl"
          type="url"
          defaultValue={category?.image_path ?? ""}
          placeholder="https://…"
        />
      </label>
      <button
        className="button primary inline-flex w-fit items-center gap-2"
        type="submit"
        disabled={!enabled || pending}
      >
        {pending ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
        {pending ? "Wird gespeichert …" : "Speichern"}
      </button>
      {state.error && <p className="form-error md:col-span-3">{state.error}</p>}
      {state.success && <p className="form-success md:col-span-3">{state.success}</p>}
    </form>
  );
}
