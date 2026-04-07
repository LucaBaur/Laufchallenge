# Admin-Leitfaden – Handball Laufchallenge 2026

Diese Seite erklärt, wie du die Laufchallenge-Website verwaltest.
Die Website wird vollständig aus der Datei **`data.json`** gespeist – es gibt keine Datenbank oder kein Backend.

---

## Inhaltsverzeichnis

1. [Dateistruktur](#dateistruktur)
2. [Einen Lauf hinzufügen](#einen-lauf-hinzufügen)
3. [Daten bearbeiten](#daten-bearbeiten)
4. [Deployment auf GitHub Pages](#deployment-auf-github-pages)
5. [Punkte-Übersicht](#punkte-übersicht)
6. [Häufige Fragen](#häufige-fragen)

---

## Dateistruktur

```
Laufchallenge/
├── index.html        ← Hauptseite (nicht ändern)
├── style.css         ← Styling (nicht ändern)
├── script.js         ← Logik (nicht ändern)
├── data.json         ← ✏️  Alle Daten hier einpflegen
└── admin-guide.md    ← Diese Anleitung
```

---

## `data.json` – Struktur

```jsonc
{
  "challenge": {
    "name": "Handball Laufchallenge 2026",
    "startDate": "2026-05-04",   // ISO-Datum YYYY-MM-DD
    "endDate":   "2026-06-21"
  },
  "teams": [ ... ],
  "players": [ ... ],
  "runs": [ ... ]
}
```

---

## Einen Lauf hinzufügen

Öffne `data.json` in einem Texteditor und füge einen neuen Eintrag im `"runs"`-Array hinzu.

### Pflichtfelder

| Feld        | Typ    | Beschreibung                                      | Beispiel           |
|-------------|--------|---------------------------------------------------|--------------------|
| `id`        | String | **Einmalige** ID (fortlaufend, z. B. `"r146"`)    | `"r146"`           |
| `player`    | String | Spieler-ID aus dem `"players"`-Array              | `"p1"`             |
| `date`      | String | Datum im Format `YYYY-MM-DD`                      | `"2026-05-10"`     |
| `startTime` | String | Startzeit im 24-h-Format `HH:MM`                 | `"07:30"`          |
| `distance`  | Number | Distanz in Kilometern (Dezimalpunkt!)             | `5.2`              |
| `elevation` | Number | Höhenmeter (ganze Zahl)                           | `145`              |
| `duration`  | Number | Dauer in **Minuten** (ganze Zahl)                 | `38`               |
| `partners`  | Array  | IDs der Mitläufer (leer `[]` bei Solorun)         | `["p2"]`           |

### Wichtig: Gruppenläufe

Wenn zwei oder mehr Spieler **gemeinsam** laufen, muss für **jeden Spieler** ein eigener Eintrag
mit denselben Werten (Distanz, Höhenmeter, Dauer) erstellt werden.  
Jeder Spieler listet die anderen als `partners`.

```jsonc
// Lukas und Maximilian laufen gemeinsam:
{ "id": "r146", "player": "p1", "date": "2026-05-10", "startTime": "07:00",
  "distance": 6.0, "elevation": 150, "duration": 43, "partners": ["p2"] },
{ "id": "r147", "player": "p2", "date": "2026-05-10", "startTime": "07:00",
  "distance": 6.0, "elevation": 150, "duration": 43, "partners": ["p1"] }
```

### Solorun

```jsonc
{ "id": "r148", "player": "p5", "date": "2026-05-12", "startTime": "21:00",
  "distance": 7.5, "elevation": 160, "duration": 53, "partners": [] }
```

---

## Daten bearbeiten

### Start- und Enddatum ändern

Ändere `startDate` und `endDate` im `"challenge"`-Objekt:

```jsonc
"challenge": {
  "name": "...",
  "startDate": "2026-05-04",   // ← hier
  "endDate":   "2026-07-01"    // ← hier
}
```

Der Countdown und die Fortschrittsanzeige aktualisieren sich automatisch.

---

### Teams bearbeiten

Jedes Team hat folgende Felder:

| Feld    | Beschreibung                           |
|---------|----------------------------------------|
| `id`    | Interne ID (nicht ändern nach Erstellt)|
| `name`  | Anzeigename                            |
| `color` | CSS-Farbe (Hex, z. B. `"#e74c3c"`)     |
| `emoji` | Emoji-Icon                             |

---

### Spieler bearbeiten

Jeder Spieler hat folgende Felder:

| Feld     | Beschreibung                                  |
|----------|-----------------------------------------------|
| `id`     | Interne ID (nie ändern nach Erstellt)         |
| `name`   | Vollständiger Name                            |
| `team`   | Team-ID (muss einer der `teams.id` sein)      |
| `gender` | `"m"` für männlich, `"f"` für weiblich        |

> **Wichtig:** `gender` wird für die Iron Man / Iron Woman Wertung benötigt.

Neuen Spieler hinzufügen:

```jsonc
{ "id": "p19", "name": "Neuer Spieler", "team": "wolves", "gender": "m" }
```

---

## Deployment auf GitHub Pages

### Erstmalig einrichten

1. Erstelle ein GitHub-Repository (öffentlich).
2. Lade alle Dateien (`index.html`, `style.css`, `script.js`, `data.json`, `admin-guide.md`) hoch.
3. Gehe zu **Settings → Pages**.
4. Wähle unter **Source**: `Deploy from a branch` → Branch `main` → Ordner `/ (root)`.
5. Speichern – nach ca. 1–2 Minuten ist die Seite unter `https://<username>.github.io/<repo>/` erreichbar.

### Läufe aktualisieren

1. Öffne `data.json` direkt auf GitHub (Edit-Button ✏️).
2. Füge die neuen Läufe ein.
3. Speichern / Commit – GitHub Pages publiziert automatisch innerhalb von Minuten.

---

## Punkte-Übersicht

### Hauptwertung (Kilometer-Ranking)

| Platz | Punkte |
|-------|--------|
| 1.    | 100    |
| 2.    | 50     |
| 3.    | 30     |

### Bonus-Läufe (> 4 km)

Jeder Lauf über 4 km gibt dem Team **+1 Punkt**.

### Bonus-Challenges (Standardwertung)

| Platz | Punkte |
|-------|--------|
| 1.    | 20     |
| 2.    | 10     |
| 3.    | 5      |

Gilt für: Längster Lauf (Distanz), Längster Lauf (Zeit), Meiste Höhenmeter,
Hill Hero, Best Duo, Längste Serie, Consistency King, Early Bird, Night Runner.

### Sonder-Bonuswertungen

| Challenge      | 1. Platz | 2. Platz | 3. Platz |
|----------------|----------|----------|----------|
| Team Rotation  | 30       | 15       | 10       |
| Double Agent   | 25       | 15       | 10       |
| Iron Man       | 25       | 15       | 10       |
| Iron Woman     | 25       | 15       | 10       |

---

## Häufige Fragen

**F: Muss ich die Website neu laden, um neue Daten zu sehen?**  
A: Ja, die Seite liest `data.json` beim Laden. Ein einfacher Browser-Refresh genügt (`F5` oder `Ctrl+R`).

**F: Können mehrere Spieler gleichzeitig in einer Gruppe laufen?**  
A: Ja. Füge alle Partner-IDs ins `partners`-Array ein. Erstelle für jeden Spieler einen eigenen Eintrag.

**F: Was passiert, wenn ich eine IDs ändere?**  
A: Das führt zu Fehlern! IDs (`id`, `player`, `team`) dürfen nach dem Erstellen nicht geändert werden,
da sie als Referenz in anderen Einträgen verwendet werden.

**F: Ist JSON-Syntax wichtig?**  
A: Ja! Fehlende Kommas, falsche Klammern oder Anführungszeichen führen dazu, dass die Seite keine Daten lädt.
Verwende einen Online-JSON-Validator (z. B. [jsonlint.com](https://jsonlint.com)) zum Prüfen.

**F: Kann ich Läufe löschen oder korrigieren?**  
A: Ja – suche die entsprechende `id` im `"runs"`-Array und ändere oder entferne den Eintrag.
Vergiss nicht, bei Gruppenläufen auch den Eintrag des Partners zu aktualisieren.
