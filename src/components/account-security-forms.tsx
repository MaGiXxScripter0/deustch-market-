"use client";

import { useActionState } from "react";
import {
  changeEmailAction,
  changePasswordAction,
  resendCurrentConfirmationAction,
  type AccountActionState,
} from "@/lib/account-actions";

type Props = {
  currentEmail: string;
  emailConfirmedAt: string | null;
  pendingEmail: string | null;
};

function ActionMessage({ state }: { state: AccountActionState }) {
  return (
    <>
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
    </>
  );
}

export function AccountSecurityForms({ currentEmail, emailConfirmedAt, pendingEmail }: Props) {
  const [confirmationState, confirmationAction, confirmationPending] = useActionState(
    resendCurrentConfirmationAction,
    {},
  );
  const [emailState, emailAction, emailPending] = useActionState(changeEmailAction, {});
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, {});

  return (
    <div className="account-security-grid">
      <section className="account-panel account-security-status">
        <p className="kicker">E-MAIL-STATUS</p>
        <h2>Ihre E-Mail-Adresse</h2>
        <p className="account-email-value">{currentEmail}</p>
        {pendingEmail ? (
          <p className="account-status account-status-pending">
            Änderung ausstehend: {pendingEmail}
          </p>
        ) : emailConfirmedAt ? (
          <p className="account-status account-status-confirmed">
            Bestätigt am {new Date(emailConfirmedAt).toLocaleDateString("de-DE")}
          </p>
        ) : (
          <p className="account-status account-status-warning">Nicht bestätigt</p>
        )}
        <form action={confirmationAction}>
          <button className="button secondary" type="submit" disabled={confirmationPending}>
            {confirmationPending ? "Wird gesendet …" : "Bestätigungs-E-Mail senden"}
          </button>
        </form>
        <ActionMessage state={confirmationState} />
      </section>

      <section className="account-panel">
        <p className="kicker">E-MAIL ÄNDERN</p>
        <h2>Neue Adresse hinterlegen</h2>
        <form className="account-form" action={emailAction}>
          <label>
            Neue E-Mail-Adresse
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <ActionMessage state={emailState} />
          <button className="button primary" type="submit" disabled={emailPending}>
            {emailPending ? "Wird gespeichert …" : "E-Mail ändern"}
          </button>
        </form>
      </section>

      <section className="account-panel">
        <p className="kicker">PASSWORT</p>
        <h2>Passwort ändern</h2>
        <form className="account-form" action={passwordAction}>
          <label>
            Aktuelles Passwort
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            Neues Passwort
            <input
              name="newPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Neues Passwort wiederholen
            <input
              name="confirmation"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <ActionMessage state={passwordState} />
          <button className="button primary" type="submit" disabled={passwordPending}>
            {passwordPending ? "Wird gespeichert …" : "Passwort ändern"}
          </button>
        </form>
      </section>
    </div>
  );
}
