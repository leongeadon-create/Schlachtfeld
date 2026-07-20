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

## Regelstand: Version 4

Die aktuelle Regelbasis ist **SPEC.md Version 4** (siehe dortiges Changelog §0).
Regeln sind als Flags in `rules.config.ts`, Aufstellungen als Presets in
`engine/setup.config.ts` gekapselt.

- **Startaufstellung V4** (`setup.config.ts`, Presets `v4` / `v3_classic`):
  12 Bauern/Spieler — vordere Reihe nur 4 Bauern (C/E/F/H), hintere voll (B–I);
  äußere Läufer auf den Flanken A/J. `createInitialState(rules, "v3_classic")`
  liefert die alte Aufstellung.
- **Brett 11 Reihen** (Ur-Reihen 6 & 8 entfernt): Rot 8–11 (Festung E11/F11),
  Blau 1–4 (Festung E1/F1), Niemandsland 5–7.
- **Läufer** zieht diagonal durch Figuren hindurch (`lightCavIgnoresBlockade`);
  Turm/Dame bleiben blockiert.
- **Bauern-Richtung** (`pawnNoBackwardStep`): Infanterie zieht/stößt nur
  vorwärts, seitwärts, diagonal-vorwärts — kein Rückwärts.
- **Diagonalschlag** (`pawnDiagonalDamage=5`): 5 statt 10 Schaden; nur bei Kill
  rückt der Bauer nach. One-Hit-Kills bleiben Kavallerie/Dame/König & Schützen-Kombi.
- **Linienbefehl** (`lineCommandEnabled`, 2 Boten): 2–4 horizontal benachbarte
  Bauern ziehen gleichzeitig 1 Feld vor (nur freie Felder, kein Angriff).
- **Schildwall** (`shieldWallEnabled`): Bauer mit eigenem Bauern links/rechts
  erleidet aus Stößen 1 statt 2 Schaden.
- **Generals-Aura** (`generalAuraEnabled`): eigene Einheit neben dem eigenen
  König macht beim Stoß +1 Schaden.
- **Stoßschaden-Formel:** `max(1, 2 + Aura(+1) − Schildwall(−1))`.

## Regel-Flags

Alle mit `[ANNAHME]` markierten Auslegungen aus `SPEC.md` sind als benannte
Flags in [`engine/rules.config.ts`](./engine/rules.config.ts) gekapselt und
lassen sich für Playtests umschalten (`makeRules({ ... })`).
