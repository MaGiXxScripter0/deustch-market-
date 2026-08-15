"use client";

import { CalendarClock, CheckCircle2, LoaderCircle, MapPin, WalletCards } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { euro } from "@/lib/catalog";
import type { RequestContactDefaults } from "@/lib/request";
import { siteConfig } from "@/lib/site-config";
import type { Product } from "@/lib/types";
import { useCart } from "./cart-provider";
import { TurnstileWidget } from "./turnstile-widget";

export function RequestForm({
  products,
  initialContact,
}: {
  products: Product[];
  initialContact: RequestContactDefaults;
}) {
  const { lines, clear, ready } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaGeneration, setCaptchaGeneration] = useState(0);
  const [verifiedCaptcha, setVerifiedCaptcha] = useState({ token: "", generation: -1 });
  const turnstileToken =
    verifiedCaptcha.generation === captchaGeneration ? verifiedCaptcha.token : "";
  const handleTokenChange = useCallback(
    (token: string) => setVerifiedCaptcha({ token, generation: captchaGeneration }),
    [captchaGeneration],
  );
  const [success, setSuccess] = useState<{
    requestNumber: string;
    pickupCode: string;
    pickupSlot: string;
    demo?: boolean;
  } | null>(null);
  const subtotal = lines.reduce(
    (sum, line) =>
      sum + (products.find((item) => item.id === line.productId)?.price ?? 0) * line.quantity,
    0,
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnstileToken) {
      setError("Bitte schließen Sie die Sicherheitsprüfung ab.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      pickupSlot: new Date(String(form.get("pickupSlot"))).toISOString(),
      comment: form.get("comment"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
      items: lines,
      "cf-turnstile-response": turnstileToken,
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
        caught instanceof Error ? caught.message : "Die Bestellung konnte nicht gesendet werden.",
      );
      setCaptchaGeneration((generation) => generation + 1);
    } finally {
      setLoading(false);
    }
  }
  if (success)
    return (
      <div className="request-success">
        <CheckCircle2 size={54} />
        <p className="kicker">BESTELLUNG EINGEGANGEN</p>
        <h1>Vielen Dank für Ihre Bestellung.</h1>
        <p>
          Ihre Bestellnummer lautet <strong>{success.requestNumber}</strong>. Wir stellen Ihre Ware
          zusammen und informieren Sie, sobald sie abgeholt werden kann.
        </p>
        <div className="pickup-success-details">
          <span>Abholung gewünscht</span>
          <strong>{new Date(success.pickupSlot).toLocaleString("de-DE")}</strong>
          <span>Abholcode</span>
          <strong>{success.pickupCode}</strong>
        </div>
        {success.demo && (
          <div className="demo-notice">
            Demo-Modus: Die Datenbankmigration ist noch nicht angewendet; diese Bestellung wurde
            nicht dauerhaft gespeichert.
          </div>
        )}
        <div>
          <Link className="button primary" href="/sortiment">
            Weiter einkaufen
          </Link>
          <Link className="button secondary" href="/konto">
            Zum Konto
          </Link>
          <Link className="button secondary" href="/bestellung">
            Bestellung verfolgen
          </Link>
        </div>
      </div>
    );
  if (!ready) return <div className="loading-card">Bestellung wird vorbereitet …</div>;
  if (!lines.length)
    return (
      <div className="empty-cart">
        <h2>Keine Produkte für die Bestellung</h2>
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
            <p>Damit wir Sie informieren können, sobald alles zur Abholung bereitsteht.</p>
            <div className="form-grid">
              <label>
                Vor- und Nachname
                <input
                  name="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  defaultValue={initialContact.name}
                />
              </label>
              <label>
                E-Mail-Adresse
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={initialContact.email}
                />
              </label>
              <label>
                Telefonnummer
                <input
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  defaultValue={initialContact.phone}
                />
              </label>
            </div>
          </div>
        </section>
        <section>
          <p className="form-step">02</p>
          <div>
            <h2>Abholung im Markt</h2>
            <div className="fulfillment-options">
              <div className="pickup-choice">
                <MapPin aria-hidden="true" />
                <span>
                  <b>Abholung im {siteConfig.pickupLocationName}</b>
                  <small>
                    Wir stellen Ihre Bestellung zusammen und informieren Sie per E-Mail.
                  </small>
                </span>
              </div>
              <div className="pickup-choice">
                <WalletCards aria-hidden="true" />
                <span>
                  <b>Zahlung bei Abholung</b>
                  <small>Bezahlen Sie Ihre Bestellung erst bei der Ausgabe im Markt.</small>
                </span>
              </div>
              <label className="pickup-time">
                <CalendarClock aria-hidden="true" />
                <span>
                  <b>Gewünschter Abholtermin</b>
                  <small>Bitte mindestens zwei Stunden Vorlauf einplanen.</small>
                </span>
                <input name="pickupSlot" type="datetime-local" required />
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
                placeholder="Zum Beispiel gewünschter Abholtag oder Fragen zu den Produkten"
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
                Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung dieser Bestellung gemäß
                der <Link href="/datenschutz">Datenschutzerklärung</Link> zu.
              </span>
            </label>
            <TurnstileWidget
              key={captchaGeneration}
              action="checkout"
              onTokenChange={handleTokenChange}
            />
          </div>
        </section>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <aside className="request-summary">
        <p className="kicker">IHRE BESTELLUNG</p>
        <div>
          <span>{lines.reduce((sum, line) => sum + line.quantity, 0)} Artikel</span>
          <strong>{euro.format(subtotal)}</strong>
        </div>
        <p>Nur Abholung im Markt. Zahlung erst bei der Ausgabe.</p>
        <button className="button primary" disabled={loading || !turnstileToken} type="submit">
          {loading ? (
            <>
              <LoaderCircle className="spin" size={17} /> Wird gesendet …
            </>
          ) : (
            "Bestellung aufgeben"
          )}
        </button>
        <Link href="/warenkorb">Warenkorb bearbeiten</Link>
      </aside>
    </form>
  );
}
