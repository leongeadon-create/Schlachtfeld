# SPEC.md — Das Kompakte Schlachtfeld (Version 4)
Schachbasiertes Kriegsspiel für 2 Spieler. Diese Spezifikation ist die einzige Wahrheitsquelle.
Mit `[ANNAHME]` markierte Regeln sind Auslegungen des Autors-Feedbacks — implementiere sie so, aber kapsle sie als Flags in `rules.config.ts`.

## 0. Änderungen in Version 4
- **Neue Startaufstellung (§2):** Pro Spieler nur noch **12 Bauern**. Die vordere Bauernreihe (Rot Reihe 8, Blau Reihe 4) hat nur 4 Bauern auf **C, E, F, H**; die hintere Reihe (Rot 9, Blau 3) bleibt voll (B–I). Die **äußeren Läufer wandern auf die Flanken A/J** (Rot A10/J10, Blau A2/J2); B/I der Kavalleriereihe bleiben leer. Alle übrigen Einheiten unverändert.
- **Aufstellung als Preset (§2):** Die Startaufstellungen liegen in `engine/setup.config.ts`. Aktuell: `v4` (Standard) und `v3_classic` (die vorherige Aufstellung mit 16 Bauern, Läufer auf B/I).

> Hinweis zur Nummerierung: Die neue Aufstellung bezieht sich auf das aktuelle **11-Reihen-Brett** (V3). Rot-Reihen wurden entsprechend abgebildet (hintere Bauern 9, vordere 8, Kavallerie 10).

## 0. Änderungen in Version 3
Alle neuen Regeln sind als benannte Flags in `rules.config.ts` gekapselt.

Bereits aus dem Playtest übernommen:
- **Brett auf 11 Reihen verkürzt** (Ur-Reihen 6 & 8 entfernt). Rot auf Reihen 8–11 (Festung E11/F11), Blau auf 1–4 (Festung E1/F1), Niemandsland = Reihen 5–7. (`board.ts`)
- **Läufer zieht diagonal durch Figuren hindurch** (ignoriert Blockaden, landet nicht auf eigenen Feldern; Turm/Dame bleiben blockiert). (Flag `lightCavIgnoresBlockade`)

Neu in Version 3:
1. **Bauern-Richtung:** Infanterie zieht/stößt nur **vorwärts, seitwärts, diagonal-vorwärts** — kein Rückwärts. Andere Einheiten unverändert. (Flag `pawnNoBackwardStep`)
2. **Diagonalschlag abgeschwächt:** Bauern-Diagonalschlag macht **5 statt 10** Schaden; nur bei Kill (Ziel ≤5 HP) rückt der Bauer nach, sonst bleibt er stehen. One-Hit-Kills (10) bleiben Kavallerie-/Dame-/König-Marschangriff und der Schützen-Kombi vorbehalten. (Flag `pawnDiagonalDamage`)
3. **Linienbefehl:** 2 Boten; 2–4 horizontal direkt benachbarte eigene Bauern ziehen gleichzeitig je 1 Feld vor (nur auf freie Felder, kein Angriff, zählt für alle als Aktivierung). (Flag `lineCommandEnabled`)
4. **Schildwall (passiv):** Bauer mit eigenem Bauern direkt links/rechts erleidet aus **Stößen** 1 statt 2 Schaden (nicht gegen Marschangriff/Diagonalschlag/Schuss). (Flag `shieldWallEnabled`)
5. **Generals-Aura (passiv):** Eigene Einheit auf einem der 8 Felder um den eigenen König macht beim **Stoß** +1 Schaden (nur Stöße). (Flag `generalAuraEnabled`)

**Stoßschaden-Formel:** `Schaden = max(1, 2 + Aura(+1) − Schildwall(−1))`.

---

## 1. Ziel & Umfang (v1 der Software)
- **Hotseat-Modus:** 2 Spieler an einem Gerät, abwechselnde Züge.
- Vollständige Regel-Engine mit Zugvalidierung + Unit-Tests.
- UI: klickbares Brett, Boten-Anzeige, HP-Anzeige pro Einheit, Zug-Log.
- **Nicht** in v1: KI-Gegner, Online-Multiplayer, Animationen.

## 2. Das Brett
- **10 Spalten (A–J) × 11 Reihen (1–11).** *(V3: Ur-Reihen 6 & 8 entfernt.)*
- Rot startet oben (Reihen 8–11), Blau unten (Reihen 1–4). Niemandsland = Reihen 5–7.
- Flanken A & J: normale, bespielbare Felder — ab **V4** stehen dort die äußeren Läufer (Kavalleriereihe), sonst leer.
- **Festungsfelder:** E11 + F11 (rote Grundlinie) und E1 + F1 (blaue Grundlinie).

### Startaufstellung (V4)
| Reihe | A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|---|
| 11 | · | T | T | · | K | D | · | T | T | · |
| 10 | L | · | S | S | L | L | S | S | · | L |
| 9  | · | B | B | B | B | B | B | B | B | · |
| 8  | · | · | B | · | B | B | · | B | · | · |
| 4  | · | · | b | · | b | b | · | b | · | · |
| 3  | · | b | b | b | b | b | b | b | b | · |
| 2  | l | · | s | s | l | l | s | s | · | l |
| 1  | · | t | t | · | k | d | · | t | t | · |

Großbuchstaben = Rot, Kleinbuchstaben = Blau. Reihen 5–7 leer. Pro Spieler: **12 Bauern** (8 hinten + 4 vorn auf C/E/F/H), 4 Läufer (A/E/F/J), 4 Schützen (C/D/G/H), 4 Türme, 1 Dame, 1 General.

## 3. Einheiten
| Einheit | Symbol | Anzahl | HP |
|---|---|---|---|
| Infanterie | B | 12 *(V4, vorher 16)* | 10 |
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
| Linienbefehl (2–4 Bauern, je 1 Schritt vor) `[V3]` | 2 Boten |
| König-Marschangriff (1 Feld, 10 Schaden) | 2 Boten `[ANNAHME]` |

## 5. Die zwei Aktionsarten

### 5.1 Der Schritt (mit Stoß)
- **Jede Einheit** (auch König) zieht **1 Feld in jede beliebige Richtung** — vor, zurück, seitlich, diagonal. **Ausnahme (V3):** Infanterie zieht/stößt nur **vorwärts, seitwärts und diagonal-vorwärts** — kein Rückwärts, auch nicht diagonal-rückwärts. (Flag `pawnNoBackwardStep`)
- Zielfeld leer → Einheit bewegt sich dorthin.
- Zielfeld gegnerisch besetzt → **Stoß:** Grundschaden **2**, die Einheit bleibt stehen. Modifiziert durch die Passive Schildwall & Generals-Aura (§6.7): **Stoßschaden = max(1, 2 + Aura(+1) − Schildwall(−1))**.
- Stirbt der Verteidiger, bleibt das Feld frei; Einrücken kostet eine neue Aktivierung in einem späteren Zug.
- Der Stoß ist auch auf Feldern erlaubt, die per Schachmuster angreifbar wären — der Spieler wählt frei zwischen billigem Stoß und teurem Marschangriff `[ANNAHME]`.

### 5.2 Der Marsch (mit Marschangriff)
- Einheit zieht im **vollen Schachmuster** ihres Typs — in **alle Richtungen, auch rückwärts, unbegrenzt weit** (frühere Rückwärtsbremsen sind gestrichen).
- Endet der Zug auf einer gegnerischen Einheit → **Marschangriff: 10 Schaden (tötet immer)**, das Feld wird eingenommen, die Einheit steht danach dort.
- **Blockaden wie im Schach:** eigene und gegnerische Einheiten blockieren die Zuglinien von Turm und Dame. Nur der Schützen-Schuss und — seit V3 — der **Läufer** ignorieren Blockaden: Der Läufer zieht diagonal durch Figuren hindurch, landet aber nie auf einem eigenen Feld. (Flag `lightCavIgnoresBlockade`)

## 6. Einheitenregeln im Detail

### 6.1 Infanterie [B] — alles für 1 Boten
- Schritt/Stoß: 1 Feld — **nur vorwärts, seitwärts, diagonal-vorwärts** (V3, kein Rückwärts).
- Schachzüge (je 1 Bote): 1 Feld geradeaus vor; **erster Zug** 2 Felder vor (beide frei, kein Angriff); **Diagonalschlag vorwärts (V3): 5 Schaden.** Stirbt das Ziel dadurch (≤5 HP), rückt der Bauer aufs Feld nach; überlebt es, bleibt der Bauer stehen. (Flag `pawnDiagonalDamage`)
- **Linienbefehl (2 Boten):** 2–4 horizontal direkt benachbarte eigene Bauern ziehen gleichzeitig je 1 Feld vor — nur auf freie Felder (blockierte Bauern bleiben stehen), kein Angriff; zählt für alle beteiligten Bauern als Aktivierung (§6.7).
- Passive: **Schildwall** und **Generals-Aura** (§6.7).
- Keine Umwandlung auf der Grundlinie — die Festungsregel ersetzt das.
- One-Hit-Kills (10 Schaden) sind ab V3 exklusiv den Marschangriffen von Kavallerie/Dame/König sowie der Schützen-Kombi vorbehalten.

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

### 6.7 Passive & Formationen (V3)

**Schildwall (passiv, `shieldWallEnabled`):** Ein Bauer mit mindestens einem eigenen **Bauern direkt links oder rechts** (horizontaler Nachbar, gleiche Reihe) erleidet aus **Stößen** nur **1 statt 2** Schaden. Gilt **nicht** gegen Marschangriff, Diagonalschlag oder Schuss. Diagonale/vertikale Nachbarn zählen nicht; der Nachbar muss selbst eine Infanterie sein.

**Generals-Aura (passiv, `generalAuraEnabled`):** Eine eigene Einheit auf einem der **8 Felder rund um den eigenen König** macht beim **Stoß +1 Schaden**. Gilt nur für Stöße, nicht für Schüsse oder Marschangriffe. Nur der **eigene** König zählt.

**Stoßschaden-Formel:** `Schaden = max(1, 2 + Aura(+1) − Schildwall(−1))`. Aura und Schildwall zusammen ergeben also wieder 2.

**Linienbefehl (`lineCommandEnabled`, 2 Boten):** 2–4 eigene Bauern, die in einer Reihe horizontal direkt nebeneinander stehen, ziehen gleichzeitig je 1 Feld vorwärts. Bauern mit blockiertem Zielfeld bleiben stehen, der Rest zieht. Kein Angriff. Zählt für **alle** beteiligten Bauern als ihre Aktivierung in diesem Zug.

## 7. Siegbedingungen
**Weg 1 — Generalsmord:** Das gegnerische HQ fällt auf 0 HP (durch Stöße, Schüsse oder einen Marschangriff).

**Weg 2 — Die Festung:**
- Ein Spieler hält die **Mehrheit auf den beiden Festungsfeldern der gegnerischen Grundlinie** (mehr eigene als gegnerische Einheiten auf E/F) `[ANNAHME: "Mehrheit" so definiert]`.
- Mehrheit über **3 eigene aufeinanderfolgende Zugenden** → Sieg. Zähler resettet, sobald die Mehrheit verloren geht.
- **Heilung:** Einheiten, die zu Beginn des eigenen Zuges auf einem gegnerischen Festungsfeld stehen, heilen **+2 HP** (max. 10).

## 8. Technische Vorgaben
- **Stack:** TypeScript. Engine als reines, UI-freies Modul (`/engine`), UI getrennt (`/ui`, React oder Vanilla + Canvas).
- Engine-API: `getLegalActions(state, unitId)`, `applyAction(state, action) → newState`, `checkVictory(state)`. State immutabel.
- **Startaufstellung als Preset (V4):** `engine/setup.config.ts` mit `SETUP_PRESETS` (`v4`, `v3_classic`); `createInitialState(rules, setup)` wählt das Preset.
- Aktionstypen im Modell: `STEP`, `PUSH` (Stoß), `MARCH`, `MARCH_ATTACK`, `SHOOT`, `SHOOT_RIDE`, `LINE_COMMAND` (V3).
- **Unit-Tests für jede Regel in §4–§7**, insbesondere: Botenbudget-Grenzen, 1-Aktivierung-pro-Einheit inkl. Schuss-Kombi-Ausnahme, Blockade-Logik, Schuss durch Blockaden, Läufer-Durchzug, Stoß-Kill ohne Nachrücken, Nachritt nur nach eigenem Schuss aufs selbe Ziel, Festungszähler-Reset, Heilungs-Cap, Bauern-Doppelschritt nur als erste Aktion der Einheit.
- **V3-Tests:** Bauer kann nicht rückwärts; Diagonalschlag 5 Schaden mit/ohne Nachrücken; Linienbefehl mit 2–4 Bauern, teilblockierter Linie und Aktivierungssperre; Schildwall nur bei horizontalem Bauern-Nachbarn und nur gegen Stöße; Generals-Aura nur um den eigenen König und nur für Stöße; kombinierter Fall Aura+Schildwall = 2 Schaden.
- **V4-Tests:** korrekte neue Startaufstellung beider Seiten; Läufer auf A/J haben ab Zug 1 mindestens einen legalen Marsch; Bauernanzahl = 12; Preset `v3_classic` liefert weiterhin die alte Aufstellung (16 Bauern, Läufer auf B/I).
- Alle `[ANNAHME]`-Regeln als benannte Flags in `rules.config.ts`.

## 9. Bewusst offen (nicht in v1 implementieren)
- KI-Gegner, Online-Multiplayer, Replay-System, Zeitlimits pro Zug.
