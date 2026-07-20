# Das Kompakte Schlachtfeld

Schachbasiertes Kriegsspiel für 2 Spieler (Hotseat) — vollständige Regel-Engine
plus klickbare Browser-UI. Regelbasis: [`SPEC.md`](./SPEC.md) (Version 2).

## Im Browser spielen

Nach dem ersten Push auf `main` deployt der GitHub-Actions-Workflow automatisch
auf GitHub Pages:

**https://leongeadon-create.github.io/Schlachtfeld/**

> Einmalig aktivieren: **Repo → Settings → Pages → Build and deployment →
> Source: „GitHub Actions"**. Danach baut und veröffentlicht jeder Push auf
> `main` das Spiel.

## Lokal entwickeln

```bash
npm install
npm run dev        # Dev-Server (Vite)
npm test           # Engine-Unit-Tests (§8)
npm run build      # Produktions-Build nach dist/
npm run preview    # gebautes Spiel lokal ansehen
```

## Projektstruktur

```
engine/            Reine, UI-freie Regel-Engine (TypeScript)
  types.ts         Datenmodell (State immutabel)
  rules.config.ts  Alle Regelparameter + [ANNAHME]-Flags (§8)
  board.ts         Brett, Startaufstellung, Festungsfelder
  actions.ts       getLegalActions, applyAction, endTurn
  victory.ts       checkVictory, Festungslogik
  index.ts         Öffentliche API
  tests/           Vitest-Tests für alle Regeln aus §4–§7
ui/                React-Hotseat-UI (klickbares Brett, Boten, HP, Zug-Log)
.github/workflows/ GitHub-Pages-Deployment
```

## Engine-API (§8)

```ts
import {
  createInitialState,
  getLegalActions,
  applyAction,
  checkVictory,
} from "./engine";

let state = createInitialState();
const actions = getLegalActions(state, unitId); // legale Aktionen inkl. Kosten
state = applyAction(state, actions[0]);          // liefert neuen State (immutabel)
const winner = checkVictory(state);              // { winner, type } | null
```

Aktionstypen: `STEP`, `PUSH`, `MARCH`, `MARCH_ATTACK`, `SHOOT`, `SHOOT_RIDE`
(plus `PASS` = Zug beenden).

## Bedienung

- **Einheit wählen:** eigene, aktionsfähige Einheit anklicken (golden umrandet).
- **Ziel wählen:** grün = Bewegung, rot = Angriff. Gibt es mehrere Optionen auf
  einem Feld (z. B. billiger **Stoß** vs. teurer **Marschangriff**), erscheint
  eine Auswahl.
- **Boten:** 8 pro Zug, ungenutzte verfallen. Jede Einheit nur einmal pro Zug
  (Schuss + Nachritt zählen als eine Aktivierung).
- **Zug beenden:** wechselt zum Gegner (Boten füllen auf, Festungs-Heilung).

## Regelstand: Version 6

Die aktuelle Regelbasis ist **SPEC.md Version 6** (siehe dortiges Changelog §0).
Ein kompaktes **Regel-Poster** liegt unter [`public/regeln.html`](./public/regeln.html)
(im Spiel unter `/regeln.html` erreichbar).

- **Brett 10×12** — Blau 1–4, Rot 9–12, Niemandsland 5–8. **Festung D–G** je Grundreihe.
- **Zermürbungs-Schaden** (kein One-Hit): `max(1, Grundangriff [×2 Charge] + Umzingelung + Aura − Schildwall)`.
  - Grundangriffe: Läufer/Turm 2, Armbrust-Schuss 3, Dame/König 4, Bauer-Diagonal 2, sonst 1.
- **Armbrustschützen** (6 HP) ersetzen die Bogenschützen: Ringschuss auf Abstand 2, über Blockaden.
- **Kavallerie-Charge** (Turm/Läufer, ≥3 bewegte Felder) = doppelter Grundangriff, plus
  **Durchbruch + Lanzendurchstich**.
- **Läufer-Fix**: echte Diagonalen, Blockade wie im Schach.
- **Kavallerie-Schritt** (L/T/S bis 2 Felder), Bauern-Doppelschritt, Rückwärts-Zug ohne Angriff.
- **Formationsbefehl** (2 Boten): 2–6 zusammenhängende Einheiten 1 Feld gleiche Richtung.

Aufstellung als Preset: `createInitialState(rules, "v6")`. Alle Werte sind Flags in
[`engine/rules.config.ts`](./engine/rules.config.ts) (`makeRules({ ... })`).
