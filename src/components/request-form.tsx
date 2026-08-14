"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { euro } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { useCart } from "./cart-provider";

export function RequestForm({ products }: { products: Product[] }) {
  const { lines, clear, ready } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ requestNumber: string; demo?: boolean } | null>(null);
  const subtotal = lines.reduce(
    (sum, line) =>
      sum + (products.find((item) => item.id === line.productId)?.price ?? 0) * line.quantity,
    0,
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      postalCode: form.get("postalCode"),
      fulfillment: form.get("fulfillment"),
      comment: form.get("comment"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
      items: lines,
    };
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSuccess(data);
      clear();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Die Anfrage konnte nicht gesendet werden.",
      );
    } finally {
      setLoading(false);
    }
  }
  if (success)
    return (
      <div className="request-success">
        <CheckCircle2 size={54} />
        <p className="kicker">ANFRAGE ERHALTEN</p>
        <h1>Vielen Dank für Ihre Anfrage.</h1>
        <p>
          Ihre Referenz lautet <strong>{success.requestNumber}</strong>. Wir melden uns
          üblicherweise innerhalb eines Werktags.
        </p>
        {success.demo && (
          <div className="demo-notice">
            Demo-Modus: Die Datenbankmigration ist noch nicht angewendet; diese Anfrage wurde nicht
            dauerhaft gespeichert.
          </div>
        )}
        <div>
          <Link className="button primary" href="/sortiment">
            Weiter einkaufen
          </Link>
          <Link className="button secondary" href="/konto">
            Zum Konto
          </Link>
        </div>
      </div>
    );
  if (!ready) return <div className="loading-card">Anfrage wird vorbereitet …</div>;
  if (!lines.length)
    return (
      <div className="empty-cart">
        <h2>Keine Produkte für die Anfrage</h2>
        <p>Fügen Sie zuerst Baustoffe zum Warenkorb hinzu.</p>
        <Link className="button primary" href="/sortiment">
          Zum Sortiment
        </Link>
      </div>
    );
  return (
    <form className="request-layout" onSubmit={submit}>
      <div className="request-fields">
        <section>
          <p className="form-step">01</p>
          <div>
            <h2>Kontaktdaten</h2>
            <p>Damit wir Ihr persönliches Angebot erstellen können.</p>
            <div className="form-grid">
              <label>
                Vor- und Nachname
                <input name="name" required minLength={2} autoComplete="name" />
              </label>
              <label>
                E-Mail-Adresse
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label>
                Telefonnummer
                <input name="phone" type="tel" required autoComplete="tel" />
              </label>
              <label>
                Postleitzahl
                <input
                  name="postalCode"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  required
                  autoComplete="postal-code"
                />
              </label>
            </div>
          </div>
        </section>
        <section>
          <p className="form-step">02</p>
          <div>
            <h2>Wie möchten Sie die Ware erhalten?</h2>
            <div className="fulfillment-options">
              <label>
                <input type="radio" name="fulfillment" value="pickup" defaultChecked />
                <span>
                  <b>Abholung Berlin-Mitte</b>
                  <small>In der Regel innerhalb von 2 Stunden</small>
                </span>
              </label>
              <label>
                <input type="radio" name="fulfillment" value="delivery" />
                <span>
                  <b>Lieferung zur Baustelle</b>
                  <small>Termin und Kosten im Angebot</small>
                </span>
              </label>
            </div>
          </div>
        </section>
        <section>
          <p className="form-step">03</p>
          <div>
            <h2>Ergänzende Angaben</h2>
            <label>
              Nachricht an unser Team
              <textarea
                name="comment"
                rows={5}
                maxLength={1000}
                placeholder="Zufahrt, gewünschter Termin oder Fragen zu den Produkten"
              />
            </label>
            <input
              className="honeypot"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <label className="consent">
              <input type="checkbox" name="consent" required />
              <span>
                Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung dieser Anfrage gemäß der{" "}
                <Link href="/datenschutz">Datenschutzerklärung</Link> zu.
              </span>
            </label>
          </div>
        </section>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <aside className="request-summary">
        <p className="kicker">IHRE ANFRAGE</p>
        <div>
          <span>{lines.reduce((sum, line) => sum + line.quantity, 0)} Artikel</span>
          <strong>{euro.format(subtotal)}</strong>
        </div>
        <p>Unverbindliche Anfrage. Es kommt noch kein Kaufvertrag zustande.</p>
        <button className="button primary" disabled={loading} type="submit">
          {loading ? (
            <>
              <LoaderCircle className="spin" size={17} /> Wird gesendet …
            </>
          ) : (
            "Angebot anfragen"
          )}
        </button>
        <Link href="/warenkorb">Warenkorb bearbeiten</Link>
      </aside>
    </form>
  );
}
