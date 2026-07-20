// engine/board.ts
// Brett-Geometrie, Startaufstellung und Positions-Hilfen (§2, §3).

import type { GameState, Player, Position, Unit, UnitType } from "./types";
import { DEFAULT_RULES, type RulesConfig } from "./rules.config";

export const COLS = 10; // A..J
export const ROWS = 11; // 1..11 (Reihen 6 & 8 des Ur-Bretts entfernt — Hausregel)
export const MIN_ROW = 1;
export const MAX_ROW = 11;

// Festungsfelder. Rote Grundlinie: E11,F11 — Blaue Grundlinie: E1,F1.
export const RED_FORTRESS: Position[] = [
  { col: 4, row: 11 }, // E11
  { col: 5, row: 11 }, // F11
];
export const BLUE_FORTRESS: Position[] = [
  { col: 4, row: 1 }, // E1
  { col: 5, row: 1 }, // F1
];

/** Die Festungsfelder, die der Spieler EROBERN muss (die des Gegners). */
export function enemyFortress(player: Player): Position[] {
  return player === "RED" ? BLUE_FORTRESS : RED_FORTRESS;
}

export function opponent(player: Player): Player {
  return player === "RED" ? "BLUE" : "RED";
}

/** Vorwärtsrichtung (Δrow) für Bauern. Rot oben (8–11) zieht abwärts, Blau aufwärts. */
export function forwardDir(player: Player): number {
  return player === "RED" ? -1 : 1;
}

export function inBounds(p: Position): boolean {
  return p.col >= 0 && p.col < COLS && p.row >= MIN_ROW && p.row <= MAX_ROW;
}

export function posEq(a: Position, b: Position): boolean {
  return a.col === b.col && a.row === b.row;
}

export function posKey(p: Position): string {
  return `${p.col},${p.row}`;
}

const LETTERS = "ABCDEFGHIJ";

/** Algebraische Notation, z.B. {col:4,row:13} -> "E13". */
export function toAlgebraic(p: Position): string {
  return `${LETTERS[p.col]}${p.row}`;
}

/** "E13" -> {col:4,row:13}. */
export function fromAlgebraic(s: string): Position {
  const col = LETTERS.indexOf(s[0].toUpperCase());
  const row = parseInt(s.slice(1), 10);
  return { col, row };
}

export function unitAt(state: GameState, p: Position): Unit | undefined {
  return Object.values(state.units).find((u) => posEq(u.pos, p));
}

export function isFortress(p: Position, side: Player): boolean {
  const fields = side === "RED" ? RED_FORTRESS : BLUE_FORTRESS;
  return fields.some((f) => posEq(f, p));
}

// --- Startaufstellung -------------------------------------------------------
// Zeilen als String über Spalten B..I (Index 1..8). Punkt = leer.
// Rot (Großbuchstaben), Blau (Kleinbuchstaben).
// Brett auf 11 Reihen verkürzt (Ur-Reihen 6 & 8 entfernt): Niemandsland = 5,6,7.
//   11 | T T · K D · T T   (Rote Grundlinie/Festung E11,F11)
//   10 | L S S L L S S L
//    9 | B B B B B B B B
//    8 | B B B B B B B B
//    4 | b b b b b b b b
//    3 | b b b b b b b b
//    2 | l s s l l s s l
//    1 | t t · k d · t t   (Blaue Grundlinie/Festung E1,F1)

const SYMBOL_TO_TYPE: Record<string, UnitType> = {
  B: "INFANTRY",
  S: "ARCHER",
  L: "LIGHT_CAV",
  T: "HEAVY_CAV",
  D: "QUEEN",
  K: "GENERAL",
};

interface RowSpec {
  row: number;
  owner: Player;
  cells: string; // 8 Zeichen für Spalten B..I
}

const LAYOUT: RowSpec[] = [
  { row: 11, owner: "RED", cells: "TT.KD.TT" },
  { row: 10, owner: "RED", cells: "LSSLLSSL" },
  { row: 9, owner: "RED", cells: "BBBBBBBB" },
  { row: 8, owner: "RED", cells: "BBBBBBBB" },
  { row: 4, owner: "BLUE", cells: "BBBBBBBB" },
  { row: 3, owner: "BLUE", cells: "BBBBBBBB" },
  { row: 2, owner: "BLUE", cells: "LSSLLSSL" },
  { row: 1, owner: "BLUE", cells: "TT.KD.TT" },
];

export function createInitialState(rules: RulesConfig = DEFAULT_RULES): GameState {
  const units: Record<string, Unit> = {};
  const counters: Record<UnitType, number> = {
    INFANTRY: 0,
    ARCHER: 0,
    LIGHT_CAV: 0,
    HEAVY_CAV: 0,
    QUEEN: 0,
    GENERAL: 0,
  };
  const prefix: Record<Player, string> = { RED: "R", BLUE: "B" };
  const shortType: Record<UnitType, string> = {
    INFANTRY: "INF",
    ARCHER: "ARC",
    LIGHT_CAV: "LC",
    HEAVY_CAV: "HC",
    QUEEN: "Q",
    GENERAL: "K",
  };

  for (const spec of LAYOUT) {
    for (let i = 0; i < spec.cells.length; i++) {
      const sym = spec.cells[i];
      if (sym === ".") continue;
      const type = SYMBOL_TO_TYPE[sym];
      const col = i + 1; // Spalte B == Index 1
      counters[type] += 1;
      const id = `${prefix[spec.owner]}_${shortType[type]}_${counters[type]}`;
      units[id] = {
        id,
        type,
        owner: spec.owner,
        hp: rules.maxHp,
        pos: { col, row: spec.row },
        hasMoved: false,
      };
    }
  }

  return {
    units,
    currentPlayer: "BLUE", // Blau (unten) beginnt
    messengers: rules.messengersPerTurn,
    activatedUnitIds: [],
    turnNumber: 1,
    fortressCounters: { RED: 0, BLUE: 0 },
    pendingRide: null,
    winner: null,
    log: [],
    rules,
  };
}

// Symbol-Zuordnung für Anzeige/Debug.
export const TYPE_TO_SYMBOL: Record<UnitType, string> = {
  INFANTRY: "B",
  ARCHER: "S",
  LIGHT_CAV: "L",
  HEAVY_CAV: "T",
  QUEEN: "D",
  GENERAL: "K",
};
