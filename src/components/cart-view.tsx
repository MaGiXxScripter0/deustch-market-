"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { euro } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { useCart } from "./cart-provider";

export function CartView({ products }: { products: Product[] }) {
  const { lines, setQuantity, remove, ready } = useCart();
  const detailed = lines
    .map((line) => ({ ...line, product: products.find((item) => item.id === line.productId) }))
    .filter((line) => line.product);
  const subtotal = detailed.reduce((sum, line) => sum + line.product!.price * line.quantity, 0);
  if (!ready) return <div className="loading-card">Warenkorb wird geladen …</div>;
  if (!detailed.length)
    return (
      <div className="empty-cart">
        <span>0</span>
        <h2>Ihr Warenkorb ist noch leer.</h2>
        <p>Entdecken Sie 24 ausgewählte Baustoffe für Ihr nächstes Vorhaben.</p>
        <Link className="button primary" href="/sortiment">
          Zum Sortiment
        </Link>
      </div>
    );
  return (
    <div className="cart-layout">
      <div className="cart-lines">
        {detailed.map(({ product, quantity }) => (
          <article className="cart-line" key={product!.id}>
            <Link href={`/produkt/${product!.slug}`} className="cart-thumb">
              <Image src={product!.image} alt={product!.imageAlt} fill sizes="120px" />
            </Link>
            <div className="cart-info">
              <p>
                {product!.brand} · {product!.sku}
              </p>
              <h2>
                <Link href={`/produkt/${product!.slug}`}>{product!.name}</Link>
              </h2>
              <small>
                {product!.inventory.pickup
                  ? "Heute in Berlin-Mitte abholbar"
                  : product!.inventory.leadTime}
              </small>
            </div>
            <div className="quantity-control">
              <button
                type="button"
                onClick={() => setQuantity(product!.id, quantity - 1)}
                aria-label="Menge verringern"
              >
                <Minus size={15} />
              </button>
              <input
                aria-label="Menge"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(product!.id, Number(event.target.value))}
              />
              <button
                type="button"
                onClick={() => setQuantity(product!.id, quantity + 1)}
                aria-label="Menge erhöhen"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="cart-price">
              <strong>{euro.format(product!.price * quantity)}</strong>
              <span>
                {euro.format(product!.price)} / {product!.saleUnit}
              </span>
              <button type="button" onClick={() => remove(product!.id)}>
                <Trash2 size={15} /> Entfernen
              </button>
            </div>
          </article>
        ))}
      </div>
      <aside className="cart-summary">
        <p className="kicker">ZUSAMMENFASSUNG</p>
        <div>
          <span>Zwischensumme</span>
          <strong>{euro.format(subtotal)}</strong>
        </div>
        <div>
          <span>Versand</span>
          <em>Nach Vereinbarung</em>
        </div>
        <div className="summary-total">
          <span>Voraussichtliche Summe</span>
          <strong>{euro.format(subtotal)}</strong>
        </div>
        <p>
          inkl. 19 % MwSt. Die endgültigen Lieferkosten und Verfügbarkeit bestätigen wir in Ihrem
          Angebot.
        </p>
        <Link className="button primary" href="/anfrage">
          Angebot anfragen
        </Link>
        <Link className="continue-shopping" href="/sortiment">
          Weiter einkaufen
        </Link>
      </aside>
    </div>
  );
}
