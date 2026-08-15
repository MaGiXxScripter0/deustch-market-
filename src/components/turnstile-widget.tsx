"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { TurnstileAction } from "@/lib/turnstile";

type WidgetOptions = {
  sitekey: string;
  action: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: WidgetOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({
  action,
  onTokenChange,
  resetKey,
}: {
  action: TurnstileAction;
  onTokenChange: (token: string) => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedResetKeyRef = useRef(resetKey);
  const [scriptReady, setScriptReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      callback: onTokenChange,
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
    });
    widgetIdRef.current = widgetId;
    return () => window.turnstile?.remove(widgetId);
  }, [action, onTokenChange, scriptReady, siteKey]);

  useEffect(() => {
    if (renderedResetKeyRef.current === resetKey) return;
    renderedResetKeyRef.current = resetKey;
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!siteKey)
    return (
      <p className="form-error" role="alert">
        Die Sicherheitsprüfung ist noch nicht konfiguriert.
      </p>
    );

  return (
    <div className="turnstile-widget" aria-label="Sicherheitsprüfung">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </div>
  );
}
