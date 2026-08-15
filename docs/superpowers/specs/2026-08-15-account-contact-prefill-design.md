# Vorbefüllung der Abholbestellung mit Kontaktdaten des Accounts

## Ziel

Auf der Seite `/anfrage` sollen eingeloggte Kunden ihre im Account hinterlegten Kontaktdaten bereits in der Bestellung sehen. Die Werte bleiben vor dem Absenden editierbar. Gäste behalten den bisherigen leeren Bestellablauf.

## Architektur

- Die Server-Seite der Anfrage lädt den aktuellen Authentifizierungsstatus über die bestehende Supabase-Server-Hilfsfunktion `getCurrentProfile()`.
- Aus dem Ergebnis werden ausschließlich die für die Bestellung benötigten Werte an `RequestForm` übergeben:
  - E-Mail aus dem authentifizierten Supabase-User,
  - Name aus `profiles.full_name`,
  - Telefon aus `profiles.phone`.
- Die Client-Komponente verwendet diese Werte nur als Initialwerte der Eingabefelder. Die Felder bleiben normale, editierbare Inputs.
- Wenn kein Benutzer oder kein Profilwert vorhanden ist, bleibt das jeweilige Feld leer.
- Der API-Request sendet weiterhin die aktuellen Formularwerte. Die bestehende Zod-Validierung bleibt unverändert die serverseitige Quelle der Wahrheit.
- Die bestehende RPC `place_pickup_order` bleibt unverändert und setzt die Zuordnung des Auftrags über `auth.uid()`. Es wird keine Benutzer-ID aus dem Browser akzeptiert.

## UX-Verhalten

Ein eingeloggter Kunde sieht Name, E-Mail-Adresse und Telefonnummer beim Öffnen des Formulars vorausgefüllt. Er kann die Daten für diesen Auftrag ändern, ohne dadurch automatisch sein dauerhaftes Profil zu verändern. Das verhindert unerwartete Profiländerungen und ist für abweichende Abholer oder Telefonnummern geeignet.

Die bestehenden `autoComplete`-Attribute, Pflichtfeldregeln, Fehlermeldungen und der Gastablauf bleiben erhalten.

## Fehlerbehandlung und Sicherheit

- Ein abgelaufener oder nicht vorhandener Auth-Cookie führt zum Gastverhalten, nicht zu einem Fehler in der Bestellseite.
- Leere oder unvollständige Profildaten werden nicht künstlich ergänzt; die vorhandene Pflichtfeldvalidierung fordert die fehlenden Werte vor dem Absenden an.
- Es werden keine sensiblen Auth-Daten an den Client übergeben.
- Die serverseitige Auth-Zuordnung der Bestellung und RLS-Regeln bleiben unverändert.

## Tests und Verifikation

- Unit-Test für die Abbildung eines optionalen Accounts auf die drei Formular-Initialwerte.
- Bestehende Request-Schema-Tests bleiben unverändert und werden weiterhin ausgeführt.
- Nach der Implementierung: `pnpm test`, `pnpm lint`, `pnpm format:check`, `pnpm build`.
- Manuelle Prüfung: Gast sieht leere Felder; eingeloggter Kunde sieht Profilwerte und kann mindestens ein Feld vor dem Absenden ändern.

## Abgrenzung

Die Änderung aktualisiert das Profil nicht automatisch und verändert weder Datenbank-Schema noch RPC-Verträge.
