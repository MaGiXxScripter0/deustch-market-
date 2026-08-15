"use client";

import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { TurnstileWidget } from "./turnstile-widget";

type AuthAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
export function AuthForm({
  action,
  mode,
}: {
  action: AuthAction;
  mode: "login" | "signup" | "reset";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const captchaGeneration = state.turnstileResetId ?? "initial";
  const [verifiedCaptcha, setVerifiedCaptcha] = useState({ token: "", generation: "" });
  const turnstileToken =
    verifiedCaptcha.generation === captchaGeneration ? verifiedCaptcha.token : "";
  const handleTokenChange = useCallback(
    (token: string) => setVerifiedCaptcha({ token, generation: captchaGeneration }),
    [captchaGeneration],
  );
  return (
    <form className="auth-form" action={formAction}>
      {mode === "signup" && (
        <>
          <label>
            Vor- und Nachname
            <input name="fullName" required autoComplete="name" />
          </label>
          <label>
            Telefonnummer <small>optional</small>
            <input name="phone" type="tel" autoComplete="tel" />
          </label>
        </>
      )}
      <label>
        E-Mail-Adresse
        <input name="email" type="email" required autoComplete="email" />
      </label>
      {mode !== "reset" && (
        <label>
          Passwort
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
      )}
      {mode !== "reset" && (
        <>
          <TurnstileWidget
            key={captchaGeneration}
            action={mode === "login" ? "login" : "signup"}
            onTokenChange={handleTokenChange}
          />
        </>
      )}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <button
        className="button primary"
        type="submit"
        disabled={pending || (mode !== "reset" && !turnstileToken)}
      >
        {pending
          ? "Bitte warten …"
          : mode === "login"
            ? "Anmelden"
            : mode === "signup"
              ? "Konto erstellen"
              : "Link anfordern"}
      </button>
      {mode === "login" && (
        <div className="auth-links">
          <Link href="/konto/passwort">Passwort vergessen?</Link>
          <Link href="/konto/registrieren">Noch kein Konto?</Link>
        </div>
      )}
    </form>
  );
}
