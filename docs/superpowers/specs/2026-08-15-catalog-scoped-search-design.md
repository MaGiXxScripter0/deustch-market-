# Suche im Sortiment und in ausgewählten Kategorien

## Ziel

Die Katalogsuche soll auf `/sortiment` gleichzeitig Kategorien und Produkte durchsuchen. Wenn Nutzer eine Kategorie öffnen, soll derselbe Suchbegriff erhalten bleiben und nur Produkte innerhalb dieser Kategorie durchsuchen.

## Nutzererlebnis

- Auf `/sortiment` gibt es ein Suchfeld im Filterbereich oberhalb der Kategorien.
- Der Suchbegriff wird als URL-Parameter `q` gespeichert.
- Die Suche auf `/sortiment` durchsucht Produktname, Artikelnummer, Marke, Beschreibung, Suchalias, technische Merkmale und den Kategorienamen.
- Die Kategorienliste wird ebenfalls anhand des Suchbegriffs gefiltert.
- Treffer in Kategorien werden als Kategorie-Link mit Produktanzahl angezeigt.
- Ein Kategorie-Link führt zu `/kategorie/{slug}?q={query}` und erhält den Suchbegriff.
- Auf `/kategorie/{slug}` zeigt das Suchfeld den Suchkontext der aktuellen Kategorie.
- Dort durchsucht `q` nur Produkte der aktuellen Kategorie.
- Das Leeren des Suchfelds entfernt ausschließlich `q`; Kategorie, Marken, Verfügbarkeit, Preis, Merkmale und Sortierung bleiben erhalten.
- Wird kein Treffer gefunden, zeigt die Seite eine klare Meldung und bietet das Zurücksetzen von `q` an.

## URL- und Navigationsmodell

Beispiele:

```text
/sortiment?q=platte
/kategorie/trockenbau?q=platte
/kategorie/trockenbau?q=platte&brand=Knauf
```

Die Kategorie bleibt über den bestehenden Kategoriepfad (`/kategorie/{slug}`) erhalten. Ein separater `category`-Parameter ist deshalb für die bestehende Anwendung nicht erforderlich.

Die Suche wird über die URL synchronisiert. Ein Absenden des Suchformulars navigiert mit den bestehenden Parametern weiter und setzt keine anderen Filter zurück. Die Browser-Historie bleibt nutzbar, damit Zurück zur vorherigen Suche oder Kategorie führt.

## Technische Struktur

- `CatalogView` liest `q` aus `useSearchParams()` und übergibt den Suchbegriff an die bestehende Katalogfilterung.
- `filterProducts` erhält die Kategorieeinschränkung zusätzlich zur Textsuche, sodass die Reihenfolge logisch `Suche -> Kategorie -> weitere Filter -> Sortierung` bleibt.
- `CatalogFilterPanel` enthält ein kleines, zugängliches Suchformular und rendert die gefilterten Kategorien.
- Die Kategorieansicht liefert bereits nur Produkte ihrer Kategorie an `CatalogView`; dadurch bleibt die Suche dort automatisch auf den aktiven Kategorieumfang begrenzt.
- Die vorhandene Normalisierung und Tippfehler-Toleranz aus `searchProducts` wird wiederverwendet.
- Die vorhandene globale Suche und die Vorschlagslogik außerhalb des Katalogs bleiben unverändert.

## Zustände und Zugänglichkeit

- Das Eingabefeld erhält ein sichtbares Label für Screenreader, `type="search"`, eine verständliche deutsche Placeholder-Beschreibung und eine erreichbare Löschen-Aktion.
- Kategorie- und Produktergebnisse behalten ihre bestehenden Links und Tastaturbedienung.
- Bei leerem Suchbegriff erscheinen alle Kategorien und Produkte.
- Bei keinem Kategorie-Treffer bleibt der Abschnitt stabil und erklärt, dass keine Kategorie passt; die Produktsuche kann trotzdem Ergebnisse liefern.
- Bei keinem Produkttreffer wird der bestehende Empty-State mit einer Suche-zurücksetzen-Aktion verwendet.

## Verifikation

- Unit-Tests prüfen, dass ein Suchbegriff Produkte global und innerhalb einer Kategorie korrekt filtert.
- Unit-Tests prüfen, dass Kategorie-Treffer nach Name, Kurzname und Beschreibung gefunden werden.
- Lint, TypeScript-Build und bestehende Tests müssen erfolgreich sein.
- Die Seite `/sortiment?q=platte` und eine konkrete Kategorie-URL mit `q` werden im Browser geprüft; dabei wird bestätigt, dass Suchbegriff, Kategorieumfang, Filter und Sortierung zusammen funktionieren.

## Nicht im Umfang

- Keine neue Suchmaschine, keine Datenbankmigration und kein neues Suchranking.
- Keine automatische Weiterleitung bei einer exakten Kategorieübereinstimmung.
- Keine Änderung der globalen Suche im Header.
