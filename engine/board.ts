// engine/board.ts
// Brett-Geometrie, Startaufstellung und Positions-Hilfen (§2, §3).

import type { GameState, Player, Position, Unit, UnitType } from "./types";
import { DEFAULT_RULES, type RulesConfig } from "./rules.config";
import { DEFAULT_SETUP, SETUP_PRESETS, type SetupName } from "./setup.config";

export const COLS = 10; // A..J
export const ROWS = 12; // 1..12 (V6)
export const MIN_ROW = 1;
export const MAX_ROW = 12;

// Festungsfelder (V6): je 4 waagerecht auf D,E,F,G. Rote Grundlinie 12, blaue 1.
export const RED_FORTRESS: Position[] = [
  { col: 3, row: 12 }, // D12
  { col: 4, row: 12 }, // E12
  { col: 5, row: 12 }, // F12
  { col: 6, row: 12 }, // G12
];
export const BLUE_FORTRESS: Position[] = [
  { col: 3, row: 1 }, // D1
  { col: 4, row: 1 }, // E1
  { col: 5, row: 1 }, // F1
  { col: 6, row: 1 }, // G1
];

/** Die Festungsfelder, die der Spieler EROBERN muss (die des Gegners). */
export function enemyFortress(player: Player): Position[] {
  return player === "RED" ? BLUE_FORTRESS : RED_FORTRESS;
}

export function opponent(player: Player): Player {
  return player === "RED" ? "BLUE" : "RED";
}

/** Vorwärtsrichtung (Δrow) für Bauern. Rot oben (9–12) zieht abwärts, Blau aufwärts. */
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

// --- Startaufstellung (§2, §3) ----------------------------------------------
// Die konkreten Aufstellungen liegen als Presets in setup.config.ts (V4).
const SYMBOL_TO_TYPE: Record<string, UnitType> = {
  B: "INFANTRY",
  S: "ARCHER",
  L: "LIGHT_CAV",
  T: "HEAVY_CAV",
  D: "QUEEN",
  K: "GENERAL",
};

/** Maximal-HP je Einheitentyp (V6: Armbrustschützen 6, sonst 10). */
export function unitMaxHp(type: UnitType, rules: RulesConfig = DEFAULT_RULES): number {
  return type === "ARCHER" ? rules.archerMaxHp : rules.maxHp;
}

export function createInitialState(
  rules: RulesConfig = DEFAULT_RULES,
  setup: SetupName = DEFAULT_SETUP,
): GameState {
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

  for (const spec of SETUP_PRESETS[setup]) {
    for (let i = 0; i < spec.cells.length; i++) {
      const sym = spec.cells[i];
      if (sym === ".") continue;
      const type = SYMBOL_TO_TYPE[sym];
      const col = i; // A == Index 0 (Reihe deckt Spalten A..J ab)
      counters[type] += 1;
      const id = `${prefix[spec.owner]}_${shortType[type]}_${counters[type]}`;
      const maxHp = unitMaxHp(type, rules);
      units[id] = {
        id,
        type,
        owner: spec.owner,
        hp: maxHp,
        maxHp,
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
