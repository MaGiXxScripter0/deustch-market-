"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction } from "@/lib/actions";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, {});

  return (
    <form className="auth-form" action={action}>
      <label>
        Neues Passwort
        <input name="password" type="password" minLength={8} autoComplete="new-password" required />
      </label>
      <label>
        Passwort wiederholen
        <input
          name="confirmation"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success} <Link href="/konto/anmelden">Zur Anmeldung</Link>
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Bitte warten …" : "Passwort speichern"}
      </button>
    </form>
  );
}
