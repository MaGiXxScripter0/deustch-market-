"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";

type AuthAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
export function AuthForm({
  action,
  mode,
}: {
  action: AuthAction;
  mode: "login" | "signup" | "reset";
}) {
  const [state, formAction, pending] = useActionState(action, {});
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
      <button className="button primary" type="submit" disabled={pending}>
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
