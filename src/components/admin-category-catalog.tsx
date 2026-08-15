"use client";

import { GripVertical, LoaderCircle, Search, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { AdminCategoryForm, type AdminCategoryRecord } from "@/components/admin-category-form";
import { deleteCategoryAction, toggleCategoryAction } from "@/lib/actions";
import {
  filterAdminCategories,
  isCategoryDeletionConfirmed,
} from "@/lib/admin-category-management";

type AdminCategoryCatalogProps = {
  categories: AdminCategoryRecord[];
  enabled: boolean;
  productCounts: Record<string, number>;
};

function CategoryDeleteDialog({
  category,
  productCount,
  enabled,
  onClose,
}: {
  category: AdminCategoryRecord | null;
  productCount: number;
  enabled: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(deleteCategoryAction, {});

  useEffect(() => {
    if (!category || !dialogRef.current || dialogRef.current.open) return;
    dialogRef.current.showModal();
  }, [category]);

  useEffect(() => {
    if (!state.success || !dialogRef.current?.open) return;
    dialogRef.current.close();
  }, [state.success]);

  function closeDialog() {
    setConfirmation("");
    onClose();
  }

  return (
    <dialog
      className="admin-category-delete-dialog"
      ref={dialogRef}
      onClose={closeDialog}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      {category && (
        <form action={action}>
          <input type="hidden" name="id" value={category.id} />
          <div className="admin-category-delete-dialog-heading">
            <Trash2 aria-hidden="true" />
            <div>
              <p className="kicker">UNWIDERRUFLICH</p>
              <h2>Kategorie löschen?</h2>
            </div>
          </div>
          <p>
            Die Kategorie <b>{category.name_de}</b> wird gelöscht. {productCount}{" "}
            {productCount === 1 ? "Produkt bleibt" : "Produkte bleiben"} erhalten und werden als{" "}
            <b>Ohne Kategorie</b> geführt.
          </p>
          <label>
            Geben Sie <b>{category.name_de}</b> ein, um fortzufahren.
            <input
              autoComplete="off"
              name="confirmation"
              onChange={(event) => setConfirmation(event.target.value.trim())}
              value={confirmation}
            />
          </label>
          {state.error && <p className="form-error">{state.error}</p>}
          <div className="admin-category-delete-actions">
            <button type="button" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Abbrechen
            </button>
            <button
              className="danger"
              type="submit"
              disabled={
                !enabled || pending || !isCategoryDeletionConfirmed(category.name_de, confirmation)
              }
            >
              {pending && <LoaderCircle className="spin" size={15} />}
              Kategorie löschen
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export function AdminCategoryCatalog({
  categories,
  enabled,
  productCounts,
}: AdminCategoryCatalogProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AdminCategoryRecord | null>(null);
  const filteredCategories = filterAdminCategories(query, categories);

  return (
    <section className="admin-category-browser" aria-label="Kategorien verwalten">
      <div className="admin-category-toolbar">
        <label className="admin-category-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Kategorien durchsuchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, URL-Slug oder Beschreibung"
            autoComplete="off"
          />
          {query && (
            <button type="button" aria-label="Suche leeren" onClick={() => setQuery("")}>
              <X aria-hidden="true" />
            </button>
          )}
        </label>
        <span className="admin-category-result-count" aria-live="polite">
          {filteredCategories.length} {filteredCategories.length === 1 ? "Kategorie" : "Kategorien"}
        </span>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="admin-category-empty" role="status">
          <strong>Keine Kategorien gefunden</strong>
          <span>Versuchen Sie einen anderen Suchbegriff.</span>
          <button type="button" onClick={() => setQuery("")}>
            Suche leeren
          </button>
        </div>
      ) : (
        <div className="admin-category-list editable">
          {filteredCategories.map((category) => {
            const productCount = productCounts[category.slug] ?? 0;

            return (
              <details key={category.id}>
                <summary>
                  <GripVertical />
                  <span className="category-number">
                    {String(category.sort_order).padStart(2, "0")}
                  </span>
                  <div>
                    <h2>{category.name_de}</h2>
                    <p>{category.description_de}</p>
                  </div>
                  <b>
                    {productCount} Produkte · {category.is_active ? "Aktiv" : "Ausgeblendet"}
                  </b>
                </summary>
                <div className="px-5 pb-2">
                  <AdminCategoryForm category={category} enabled={enabled} />
                </div>
                <div className="category-actions">
                  <form action={toggleCategoryAction} className="category-toggle-form">
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="active" value={String(!category.is_active)} />
                    <button type="submit" disabled={!enabled}>
                      {category.is_active ? "Kategorie ausblenden" : "Kategorie aktivieren"}
                    </button>
                  </form>
                  <button
                    className="admin-category-delete"
                    type="button"
                    disabled={!enabled}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Kategorie löschen
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <CategoryDeleteDialog
        key={selectedCategory?.id ?? "closed"}
        category={selectedCategory}
        productCount={selectedCategory ? (productCounts[selectedCategory.slug] ?? 0) : 0}
        enabled={enabled}
        onClose={() => setSelectedCategory(null)}
      />
    </section>
  );
}
