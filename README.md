# Laufchallenge

*Static single-page site for a six-week running challenge between handball teams:
rankings, charts, countdown, activity feed and bonus goals. Vanilla JS, no build
step, no backend — all content comes from one `data.json`. Runs on GitHub Pages.*

---

Eine Laufchallenge über sechs Wochen: drei Teams, jede Person trägt ihre Läufe
ein, die Seite rechnet daraus Team- und Einzelwertung, zeigt den Verlauf als
Diagramm und einen Aktivitäts-Feed. Zusätzlich gibt es Bonus-Challenges (einmal
pro Team bzw. pro Person erreichbar) und am Ende einen Endstand mit Podium.

Es gibt keine Datenbank und kein Backend. Die komplette Website wird aus
`data.json` erzeugt; Läufe pflegt man dort von Hand ein (oder mit den kleinen
Helfern `add_run.py` / `add_run_gui.py`). Das hält den Betrieb kostenlos und
macht die Daten jederzeit einsehbar.

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html` | Seitengerüst, Abschnitte Countdown / Teams / Spieler / Feed / Bonus / Endstand |
| `script.js` | gesamte Logik: Wertung, Diagramme (Canvas, ohne Bibliothek), Countdown, Feed, Filter |
| `style.css` | Gestaltung, responsives Layout, Team-Farben |
| `data.json` | alle Inhalte: Challenge-Zeitraum, Teams, Personen, Läufe, Bonus-Status |
| `demo.json` | Beispieldatensatz mit erfundenen Namen; Umschalter oben rechts auf der Seite |
| `admin-guide.md` | Anleitung zum Pflegen von `data.json` und zum Deployment |
| `add_run.py`, `add_run_gui.py` | Läufe per Kommandozeile bzw. kleinem Tkinter-Fenster ergänzen |

## Wertung

- **Kilometer** zählen direkt. **Höhenmeter** gehen anteilig mit ein.
- **Gemeinsame Läufe** (mehrere Personen als `partners`) geben einen Bonus,
  damit sich Verabreden lohnt.
- Die **Team-Wertung** teilt durch die Teamgröße, sonst gewinnt das größte Team
  automatisch.
- **Bonus-Challenges** sind feste Zusatzpunkte, jede nur einmal.

Die genaue Punkteformel steht in `admin-guide.md` und an einer Stelle in
`script.js` (`berechnePunkte`).

## Lokal ansehen

```bash
python -m http.server 8000
# http://localhost:8000
```

Ein direkter Doppelklick auf `index.html` funktioniert nicht, weil der Browser
`data.json` dann nicht laden darf (`file://`-Einschränkung).

Oben rechts schaltet ein Knopf zwischen echten Daten und `demo.json` um — für
Screenshots und zum Ausprobieren ohne die echten Namen.

## Deployment

GitHub Pages auf den `main`-Branch. Änderungen an `data.json` sind nach dem
Push innerhalb einer Minute live. Details in `admin-guide.md`.

## Daten

`data.json` enthält die Vornamen der Teilnehmenden und ihre Laufdaten. Fotos
einzelner Personen und Belegbilder einzelner Läufe liegen bewusst nicht im
Repository; die drei Teamfotos schon.

## Lizenz

Kein ausdrücklicher Lizenzvermerk. Der Code darf angesehen und als Vorlage
genutzt werden; die Daten in `data.json` gehören den Teilnehmenden.
