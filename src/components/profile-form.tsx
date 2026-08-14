"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, {});

  return (
    <form className="profile-form" action={action}>
      <div>
        <p className="kicker">KONTAKTDATEN</p>
        <h2>Mein Profil</h2>
      </div>
      <label>
        Vor- und Nachname
        <input name="fullName" defaultValue={fullName} autoComplete="name" required />
      </label>
      <label>
        Telefonnummer
        <input name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </label>
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
        <Save size={16} /> {pending ? "Wird gespeichert …" : "Profil speichern"}
      </button>
    </form>
  );
}
