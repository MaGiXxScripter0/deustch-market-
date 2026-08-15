import { PackageCheck } from "lucide-react";
import type { Product } from "@/lib/types";
import { siteConfig } from "@/lib/site-config";

type ProductAvailabilityProps = {
  saleUnit: string;
  inventory: Product["inventory"];
};

export function ProductAvailability({ saleUnit, inventory }: ProductAvailabilityProps) {
  const lowStock = inventory.pickup && inventory.berlin > 0 && inventory.berlin <= 10;
  return (
    <div className="fulfillment-card" aria-live="polite">
      <div className="selected">
        <PackageCheck aria-hidden="true" />
        <span>
          <b>
            {lowStock ? "Nur noch " : ""}
            {inventory.berlin} {saleUnit} in {siteConfig.storeName}
          </b>
          <small>
            <i /> {inventory.pickup ? inventory.pickupLeadTime : "Abholung auf Anfrage"}
          </small>
        </span>
      </div>
    </div>
  );
}
