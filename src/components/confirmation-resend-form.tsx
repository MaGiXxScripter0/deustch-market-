"use client";

import { useActionState, useCallback, useState } from "react";
import { resendSignupConfirmationAction, type AccountActionState } from "@/lib/account-actions";
import { TurnstileWidget } from "./turnstile-widget";

export function ConfirmationResendForm() {
  const [state, action, pending] = useActionState<AccountActionState, FormData>(
    resendSignupConfirmationAction,
    {},
  );
  const [token, setToken] = useState("");
  const generation = state.turnstileResetId ?? "initial";
  const onTokenChange = useCallback((nextToken: string) => setToken(nextToken), []);
  return (
    <form className="confirmation-resend-form" action={action}>
      <div>
        <h2>Bestätigungs-E-Mail erneut senden</h2>
        <p>Falls Ihr Konto noch nicht bestätigt ist, senden wir Ihnen den Link erneut.</p>
      </div>
      <label>
        E-Mail-Adresse
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <TurnstileWidget key={generation} action="resend-signup" onTokenChange={onTokenChange} />
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
      <button className="button secondary" type="submit" disabled={pending || !token}>
        {pending ? "Bitte warten …" : "Bestätigungs-E-Mail erneut senden"}
      </button>
    </form>
  );
}
