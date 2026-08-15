import type { Metadata } from "next";
import { OrderTrackingForm } from "@/components/order-tracking-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: `Bestellung verfolgen | ${siteConfig.name}` };

export default function OrderTrackingPage() {
  return (
    <main className="shell page-main tracking-page">
      <div className="page-hero compact">
        <p className="kicker">ABHOLBESTELLUNG</p>
        <h1>Bestellung verfolgen.</h1>
        <p>
          Geben Sie die Bestellnummer und den sechsstelligen Abholcode aus Ihrer Bestätigung ein.
        </p>
      </div>
      <OrderTrackingForm />
    </main>
  );
}
