import Image from "next/image";
import Link from "next/link";
import { euro } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { AddToCart } from "./add-to-cart";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="product-image" href={`/produkt/${product.slug}`}>
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="(max-width:700px) 50vw, (max-width:1100px) 33vw, 25vw"
        />
        <span className={`availability ${product.inventory.berlin === 0 ? "order" : ""}`}>
          {product.inventory.berlin > 0 ? "Abholung heute" : "Online lieferbar"}
        </span>
      </Link>
      <div className="product-content">
        <p>
          {product.brand} · {product.sku}
        </p>
        <h3>
          <Link href={`/produkt/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="stock-line">
          <i className={product.inventory.berlin > 0 ? "in-stock" : "online"} />
          {product.inventory.berlin > 0
            ? `${product.inventory.berlin} Stück in Berlin-Mitte`
            : product.inventory.leadTime}
        </div>
        <div className="product-price">
          <strong>{euro.format(product.price)}</strong>
          <span>
            /{product.saleUnit}
            <br />
            {euro.format(product.basePrice)}/{product.baseUnit}
          </span>
        </div>
        <AddToCart productId={product.id} compact />
      </div>
    </article>
  );
}
