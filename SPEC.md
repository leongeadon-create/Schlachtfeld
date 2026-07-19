# SPEC.md — Das Kompakte Schlachtfeld (Version 2)
Schachbasiertes Kriegsspiel für 2 Spieler. Diese Spezifikation ist die einzige Wahrheitsquelle.
Mit `[ANNAHME]` markierte Regeln sind Auslegungen des Autors-Feedbacks — implementiere sie so, aber kapsle sie als Flags in `rules.config.ts`.

---

## 1. Ziel & Umfang (v1 der Software)
- **Hotseat-Modus:** 2 Spieler an einem Gerät, abwechselnde Züge.
- Vollständige Regel-Engine mit Zugvalidierung + Unit-Tests.
- UI: klickbares Brett, Boten-Anzeige, HP-Anzeige pro Einheit, Zug-Log.
- **Nicht** in v1: KI-Gegner, Online-Multiplayer, Animationen.

## 2. Das Brett
- **10 Spalten (A–J) × 13 Reihen (1–13).**
- Rot startet oben (Reihen 10–13), Blau unten (Reihen 1–4).
- Flanken A & J: normale, bespielbare Felder — starten nur leer.
- **Festungsfelder:** E13 + F13 (rote Grundlinie) und E1 + F1 (blaue Grundlinie).

### Startaufstellung
| Reihe | Spalten B–I |
|---|---|
| 13 | T T · K D · T T |
| 12 | L S S L L S S L |
| 11 | B B B B B B B B |
| 10 | B B B B B B B B |
| 4  | b b b b b b b b |
| 3  | b b b b b b b b |
| 2  | l s s l l s s l |
| 1  | t t · k d · t t |

Großbuchstaben = Rot, Kleinbuchstaben = Blau. Reihen 5–9 leer. Spalten A/J und D/G der Grundreihen leer.

## 3. Einheiten
| Einheit | Symbol | Anzahl | HP |
|---|---|---|---|
| Infanterie | B | 16 | 10 |
| Berittene Bogenschützen | S | 4 | 10 |
| Leichte Kavallerie (Läufer) | L | 4 | 10 |
| Schwere Kavallerie (Turm) | T | 4 | 10 |
| Dame (Elite) | D | 1 | 10 |
| General / HQ | K | 1 | 10 |

Alle Einheiten starten mit und heilen maximal bis **10 HP**.

## 4. Das Boten-System
1. Jeder Spieler erhält zu Zugbeginn **8 Boten**.
2. **Ungenutzte Boten verfallen** am Zugende — kein Ansparen.
3. **Jede Einheit darf pro Zug nur einmal aktiviert werden.** Die Schützen-Kombi (§6.2) zählt als EINE Aktivierung.
4. Der Zug endet, wenn der Spieler passt oder keine bezahlbare Aktion mehr existiert.

### Botenkosten
| Aktion | Kosten |
|---|---|
| Schritt / Stoß (1 Feld, jede Einheit) | 1 Bote |
| Marsch / Marschangriff (voller Schachzug von L, T, D, S) | 2 Boten |
| Alle Bauern-Schachzüge (Vorrücken, Doppelschritt, Diagonalschlag) | 1 Bote |
| Schützen-Schuss | 1 Bote |
| Schützen-Nachritt (Zusatz zum Schuss) | +1 Bote |
| König-Marschangriff (1 Feld, 10 Schaden) | 2 Boten `[ANNAHME]` |

## 5. Die zwei Aktionsarten

### 5.1 Der Schritt (mit Stoß)
- **Jede Einheit** (auch Infanterie, auch König) zieht **1 Feld in jede beliebige Richtung** — vor, zurück, seitlich, diagonal.
- Zielfeld leer → Einheit bewegt sich dorthin.
- Zielfeld gegnerisch besetzt → **Stoß:** **2 Schaden**, die Einheit bleibt stehen. (Beispiel des Autors: zwei Bauern rennen 5× frontal ineinander → 5 × 2 = 10 → der Verteidiger stirbt.)
- Stirbt der Verteidiger, bleibt das Feld frei; Einrücken kostet eine neue Aktivierung in einem späteren Zug.
- Der Stoß ist auch auf Feldern erlaubt, die per Schachmuster angreifbar wären — der Spieler wählt frei zwischen billigem Stoß und teurem Marschangriff `[ANNAHME]`.

### 5.2 Der Marsch (mit Marschangriff)
- Einheit zieht im **vollen Schachmuster** ihres Typs — in **alle Richtungen, auch rückwärts, unbegrenzt weit** (frühere Rückwärtsbremsen sind gestrichen).
- Endet der Zug auf einer gegnerischen Einheit → **Marschangriff: 10 Schaden (tötet immer)**, das Feld wird eingenommen, die Einheit steht danach dort.
- **Blockaden wie im Schach:** eigene und gegnerische Einheiten blockieren die Zuglinien von Läufer, Turm und Dame. Nur der Schützen-Schuss ignoriert Blockaden.

## 6. Einheitenregeln im Detail

### 6.1 Infanterie [B] — alles für 1 Boten
- Schritt/Stoß: 1 Feld, jede Richtung.
- Schachzüge (je 1 Bote): 1 Feld geradeaus vor; **erster Zug** 2 Felder vor (beide frei, kein Angriff); **Diagonalschlag vorwärts = Marschangriff (10 Schaden, nimmt Feld)**.
- Keine Umwandlung auf der Grundlinie — die Festungsregel ersetzt das.
- ⚠ Balance-Hinweis für Playtests: Bauern-Diagonalkill für nur 1 Boten macht Bauernketten extrem kosteneffizient. Vom Autor so gewollt; als Flag kapseln.

### 6.2 Berittene Bogenschützen [S]
- **Schuss (1 Bote):** Ziel im **Springer-Muster (L)**, **5 Schaden**, ignoriert alle Blockaden, Schütze bleibt stehen.
- **Nachritt (+1 Bote, optional, direkt im Anschluss):** reitet dasselbe Ziel nieder — **weitere 5 Schaden** (zusammen 10 → Ziel stirbt), Schütze nimmt das Feld ein. Schuss + Nachritt = eine Aktivierung, 2 Boten gesamt.
- War das Ziel schon vor dem Schuss auf ≤5 HP und stirbt durch den Schuss allein, darf der Nachritt (+1 Bote) auf das frei gewordene Feld erfolgen `[ANNAHME]`.
- Normaler **Springer-Marsch** (2 Boten): volles L-Muster auf leeres Feld oder als Marschangriff (10 Schaden) `[ANNAHME: bleibt zusätzlich zur Schuss-Kombi erlaubt]`.

### 6.3 Leichte Kavallerie [L]
- Marsch: volle Diagonalen, alle Richtungen (bleibt farbgebunden).
- Schritt/Stoß: 1 Feld jede Richtung — nur so wechselt sie die Feldfarbe.

### 6.4 Schwere Kavallerie [T]
- Marsch: volle gerade Linien, alle Richtungen (keine Rückwärtsbeschränkung mehr).
- Schritt/Stoß: 1 Feld jede Richtung (einzige Diagonalbewegung des Turms).

### 6.5 Dame [D]
- Marsch: alle Richtungen, unbegrenzt (Läufer + Turm kombiniert).
- Schritt/Stoß: 1 Feld, 2 Schaden — kein Extra-Schaden mehr; alle Einheiten stoßen gleich stark.

### 6.6 General / HQ [K]
- Schritt/Stoß: 1 Feld, jede Richtung (1 Bote).
- Marschangriff: 1 Feld, 10 Schaden, nimmt Feld (2 Boten) `[ANNAHME]`.
- Kein Schach/Schachmatt-Konzept — der König ist eine normale Einheit mit 10 HP.

## 7. Siegbedingungen
**Weg 1 — Generalsmord:** Das gegnerische HQ fällt auf 0 HP (durch Stöße, Schüsse oder einen Marschangriff).

**Weg 2 — Die Festung:**
- Ein Spieler hält die **Mehrheit auf den beiden Festungsfeldern der gegnerischen Grundlinie** (mehr eigene als gegnerische Einheiten auf E/F) `[ANNAHME: "Mehrheit" so definiert]`.
- Mehrheit über **3 eigene aufeinanderfolgende Zugenden** → Sieg. Zähler resettet, sobald die Mehrheit verloren geht.
- **Heilung:** Einheiten, die zu Beginn des eigenen Zuges auf einem gegnerischen Festungsfeld stehen, heilen **+2 HP** (max. 10).

## 8. Technische Vorgaben
- **Stack:** TypeScript. Engine als reines, UI-freies Modul (`/engine`), UI getrennt (`/ui`, React oder Vanilla + Canvas).
- Engine-API: `getLegalActions(state, unitId)`, `applyAction(state, action) → newState`, `checkVictory(state)`. State immutabel.
- Aktionstypen im Modell: `STEP`, `PUSH` (Stoß), `MARCH`, `MARCH_ATTACK`, `SHOOT`, `SHOOT_RIDE`.
- **Unit-Tests für jede Regel in §4–§7**, insbesondere: Botenbudget-Grenzen, 1-Aktivierung-pro-Einheit inkl. Schuss-Kombi-Ausnahme, Blockade-Logik, Schuss durch Blockaden, Stoß-Kill ohne Nachrücken, Nachritt nur nach eigenem Schuss aufs selbe Ziel, Festungszähler-Reset, Heilungs-Cap, Bauern-Doppelschritt nur als erste Aktion der Einheit.
- Alle `[ANNAHME]`-Regeln als benannte Flags in `rules.config.ts`.

## 9. Bewusst offen (nicht in v1 implementieren)
- KI-Gegner, Online-Multiplayer, Replay-System, Zeitlimits pro Zug.
