# SPEC.md — Das Kompakte Schlachtfeld (Version 6)
Schachbasiertes Kriegsspiel für 2 Spieler (Hotseat). Diese Spezifikation ist die einzige Wahrheitsquelle.
Alle Zahlenwerte und Schalter sind als benannte Flags in `engine/rules.config.ts` gekapselt; Startaufstellungen als Presets in `engine/setup.config.ts`.

## 0. Änderungen in Version 6
- **Brett 10×12** (vorher 10×11). Blau 1–4, Rot 9–12, Niemandsland 5–8.
- **Festung**: 4 waagerechte Felder **D,E,F,G** je Grundreihe (1 blau, 12 rot).
- **Neues Schadenssystem (Zermürbung)**: kein One-Hit mehr. Jede Einheit hat einen Grundangriff; getötet wird erst bei 0 HP.
- **Armbrustschützen** ersetzen die berittenen Bogenschützen: 6 HP, Ringschuss auf Abstand 2.
- **Kavallerie-Charge** (Turm/Läufer, ≥3 bewegte Felder) mit **doppeltem** Grundangriff, plus **Durchbruch + Lanzendurchstich**.
- **Läufer-Fix**: echte Diagonalen, kein Überspringen mehr; Blockade wie im Schach.
- **Kavallerie-Schritt** (L/T/S) bis 2 Felder gerade.
- **Formationsbefehl** (aus v5) für 2–6 zusammenhängende Einheiten.

---

## 1. Ziel & Umfang
- **Hotseat-Modus:** 2 Spieler an einem Gerät, abwechselnde Züge.
- Vollständige Regel-Engine mit Zugvalidierung + Unit-Tests.
- UI: klickbares Brett, Boten-Anzeige, HP pro Einheit, Zug-Log.
- **Nicht** enthalten: KI-Gegner, Online-Multiplayer, Animationen.

## 2. Das Brett
- **10 Spalten (A–J) × 12 Reihen (1–12).**
- Blau startet unten (Reihen 1–4), Rot oben (Reihen 9–12). Niemandsland = Reihen 5–8.
- Flanken A & J: normale, bespielbare Felder — starten leer.
- **Festungsfelder (4 waagerecht):** D1,E1,F1,G1 (blaue Grundreihe) und D12,E12,F12,G12 (rote Grundreihe).

### Startaufstellung (Preset `v6`)
| Reihe | A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|---|
| 12 | · | T | T | · | K | D | · | T | T | · |
| 11 | · | L | S | S | L | L | S | S | L | · |
| 10 | · | B | B | B | B | B | B | B | B | · |
| 9  | · | B | B | B | B | B | B | B | B | · |
| 4  | · | b | b | b | b | b | b | b | b | · |
| 3  | · | b | b | b | b | b | b | b | b | · |
| 2  | · | l | s | s | l | l | s | s | l | · |
| 1  | · | t | t | · | k | d | · | t | t | · |

Großbuchstaben = Rot, Kleinbuchstaben = Blau. König auf E, Dame auf F (beide auf der Festungsreihe).

## 3. Einheiten & HP
| Einheit | Symbol | Anzahl | HP |
|---|---|---|---|
| Infanterie | B | 16 | 10 |
| Armbrustschützen | S | 4 | **6** |
| Läufer | L | 4 | 10 |
| Turm | T | 4 | 10 |
| Dame | D | 1 | 10 |
| König / HQ | K | 1 | 10 |

Heilung/Maximum ist pro Einheit gedeckelt (Armbrust 6, sonst 10).

## 4. Das Boten-System
1. Jeder Spieler erhält zu Zugbeginn **8 Boten**. Ungenutzte verfallen.
2. **Jede Einheit darf pro Zug nur einmal aktiviert werden.**
3. Der Zug endet, wenn der Spieler passt oder keine bezahlbare Aktion mehr existiert.

### Botenkosten
| Aktion | Kosten |
|---|---|
| Schritt / Kavallerie-Schritt / Nahangriff | 1 Bote |
| Armbrust-Schuss | 1 Bote |
| Marsch / Marsch-Angriff | 2 Boten |
| Formationsbefehl | 2 Boten |

## 5. Schadenssystem (Zermürbung)
Jede Einheit hat **einen Grundangriff**:

| Einheit / Angriff | Grundangriff |
|---|---|
| Läufer, Turm | 2 |
| Armbrustschütze (Schuss) | 3 |
| Bauer (Diagonalangriff vorwärts) | 2 |
| Dame, König | 4 |
| alle sonstigen Angriffe | 1 |

**Schadensformel (in dieser Reihenfolge, Minimum 1):**
```
Schaden = Grundangriff [×2 bei Kavallerie-Charge] + Umzingelung + Aura − Schildwall
```
- **Umzingelung:** je gegnerischem (= angreifer-eigenem) Nachbarn des Ziels **über den ersten hinaus +2** (2 Nachbarn = +2, 3 = +4, 4 = +6 …).
- **Aura:** steht der Angreifer auf einem der 8 Felder um den **eigenen** König → +1.
- **Schildwall:** ist das Ziel ein Bauer mit eigenem Bauern **direkt links/rechts** → −1; gilt nur gegen **Nahangriffe**, nicht gegen Schüsse.

Ein Angriff tötet ein Feld erst, wenn dessen HP auf **0** fällt.

## 6. Bewegung & Angriffsarten
Jede Einheit wird pro Zug nur **einmal** aktiviert.

- **SCHRITT (1 Bote):** 1 Feld in jede Richtung. Auf einen Gegner = **Nahangriff im Stand**.
- **KAVALLERIE-SCHRITT:** Läufer, Turm und Armbrustschützen dürfen beim Schritt **bis zu 2 Felder** gerade ziehen (Zwischenfeld frei). Angriff nur auf das Endfeld — der Angreifer rückt dabei aufs Zwischenfeld und schlägt von dort.
- **MARSCH (2 Boten):** voller Schachzug der Figur, durch Einheiten blockiert.
  - **Läufer:** echte Diagonalen — jedes Zwischenfeld muss frei sein (kein Überspringen).
  - **Turm:** gerade Linien. **Dame:** gerade + diagonal.
  - Der Angreifer stoppt auf dem letzten freien Feld vor dem Ziel und greift mit seinem Grundangriff an.
  - **KAVALLERIE-CHARGE:** Legt ein Turm/Läufer im Marsch **≥3 freie Felder** zurück und greift am Ende an, zählt der Grundangriff **doppelt** (2×2 = 4) vor den Boni.

### Durchbruch + Lanzendurchstich (nur bei Kavallerie-Charge)
Tötet eine Charge ihr Ziel:
- Ist das Feld **hinter** dem Ziel (in Bewegungsrichtung) frei → die Kavallerie **rückt 1 Feld nach** (reitet nieder).
- Steht dort ein **Gegner** → der **Überschuss** (zugefügter Schaden − Rest-HP des ersten Ziels) wird **−1** an diese Einheit weitergegeben und **kettet** nach hinten weiter (jeweils −1), bis der Schaden ≤0 ist oder ein Feld frei/eigene Einheit ist.
- **Eigene Einheit dahinter** → Momentum stoppt (kein Friendly Fire).
- Wird das Feld hinter dem Ziel **erst durch die Kette** frei, darf die Kavallerie trotzdem nachrücken.

Durchbruch gilt **nur** für die Charge (≥3 Felder), nicht für kurze Marsch-/Nahangriffe.

## 7. Einheiten im Detail
- **Infanterie [B]:** Schritt 1 Feld (auch rückwärts auf leeres Feld), Doppelschritt als erste Bewegung; **kein Rückwärts-Angriff**. Diagonalangriff vorwärts = Grundangriff 2, sonst 1.
- **Läufer [L]:** Marsch über echte Diagonalen (blockiert), Kavallerie-Schritt, farbgebunden; Farbwechsel per 1-Feld-Schritt. Grundangriff 2.
- **Turm [T]:** Marsch gerade, Kavallerie-Schritt. Grundangriff 2.
- **Dame [D]:** Marsch gerade + diagonal. Grundangriff 4. (Keine Charge.)
- **König [K]:** nur Schritt (1 Feld). Grundangriff 4.
- **Armbrustschütze [S]:** 6 HP. **Schuss (1 Bote):** 3 Schaden auf den **Ring im Abstand genau 2** (die 16 Felder eines 5×5-Quadrats ohne inneren 3×3-Kern; die 8 Nachbarfelder sind tote Zone), ignoriert Blockaden. Kavallerie-Schritt zum Bewegen. Pro Zug **bewegen ODER schießen** (eine Aktivierung).

## 8. Formationsbefehl
**2 Boten.** 2–6 zusammenhängende eigene Einheiten (Reihe waagerecht oder senkrecht) ziehen alle **1 Feld in dieselbe Richtung**. Blockierte Einheiten ziehen nicht bzw. greifen einen Gegner im Weg an; Infanterie darf nicht rückwärts. Zählt als Aktivierung **aller** Beteiligten.

## 9. Siegbedingungen
**Weg 1 — Generalsmord:** Das gegnerische HQ (König) fällt auf 0 HP.

**Weg 2 — Die Festung:**
- Ein Spieler hält die **Mehrheit auf den 4 Festungsfeldern (D–G)** der gegnerischen Grundreihe (mehr eigene als gegnerische Einheiten).
- Mehrheit über **3 eigene aufeinanderfolgende Zugenden** → Sieg. Zähler resettet, sobald die Mehrheit verloren geht.
- **Heilung:** Einheiten, die zu Beginn des eigenen Zuges auf einem gegnerischen Festungsfeld stehen, heilen **+2 HP** (bis zum eigenen Maximum).

## 10. Technische Vorgaben
- **Stack:** TypeScript. Engine als reines, UI-freies Modul (`/engine`), UI getrennt (`/ui`, React).
- Engine-API: `getLegalActions(state, unitId)`, `applyAction(state, action) → newState`, `checkVictory(state)`. State immutabel.
- Aktionstypen: `STEP`, `STEP_ATTACK`, `MARCH`, `MARCH_ATTACK`, `SHOOT`, `FORMATION`, `PASS`.
- Startaufstellung als Preset: `createInitialState(rules, "v6")`.
- **Unit-Tests (mindestens):** Schadensformel (alle Grundwerte, Umzingelung 2/3/4, Aura, Schildwall, Minimum 1, Dame/König = 4); Kavallerie-Charge (2 Felder einfach, 3 doppelt); Läufer blockiert korrekt/teleportiert nicht, Farbwechsel per Schritt; Armbrust trifft nur Ring-Abstand-2, nicht Nachbarn, schießt über Einheiten, 6 HP, bewegen-oder-schießen; Lanzendurchstich (Nachrücken, Überschuss−1, Kette, Stopp an eigener Einheit); Festung D–G (Mehrheit, 3-Zugenden-Sieg, Heilung); Brettmaße 10×12 und Startaufstellung.
