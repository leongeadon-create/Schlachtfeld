// engine/types.ts
// Kernmodell für "Das Kompakte Schlachtfeld" (Version 6).
// State ist immutabel: applyAction erzeugt immer einen neuen State.

import type { RulesConfig } from "./rules.config";

export type Player = "RED" | "BLUE";

export type UnitType =
  | "INFANTRY" // B  — Infanterie
  | "ARCHER" //   S  — Armbrustschützen (Schuss auf Ring-Abstand 2)
  | "LIGHT_CAV" // L  — Läufer (echte Diagonalen)
  | "HEAVY_CAV" // T  — Turm (gerade Linien)
  | "QUEEN" //    D  — Dame
  | "GENERAL"; //  K  — König / HQ

/** Brettposition. col 0..9 (A..J), row 1..12. */
export interface Position {
  col: number;
  row: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  owner: Player;
  hp: number;
  maxHp: number;
  pos: Position;
  /** true, sobald die Einheit ihr Startfeld je verlassen hat (Bauern-Doppelschritt). */
  hasMoved: boolean;
}

export type ActionType =
  | "STEP" //          Schritt/Kavallerie-Schritt auf leeres Feld
  | "STEP_ATTACK" //   Nahangriff im Stand (1 Bote), inkl. Kavallerie-Schritt-Angriff
  | "MARCH" //         Marsch: voller Schachzug auf leeres Feld (2 Boten)
  | "MARCH_ATTACK" //  Marsch-Angriff (2 Boten), Kavallerie-Charge/Durchbruch möglich
  | "SHOOT" //         Armbrust-Schuss auf Ring-Abstand 2 (1 Bote)
  | "FORMATION" //     Formationsbefehl: 2–6 Einheiten 1 Feld gleiche Richtung (2 Boten)
  | "PASS"; //         Zug beenden

export interface StepAction {
  type: "STEP";
  unitId: string;
  to: Position;
}
export interface StepAttackAction {
  type: "STEP_ATTACK";
  unitId: string;
  target: Position;
}
export interface MarchAction {
  type: "MARCH";
  unitId: string;
  to: Position;
}
export interface MarchAttackAction {
  type: "MARCH_ATTACK";
  unitId: string;
  target: Position;
}
export interface ShootAction {
  type: "SHOOT";
  unitId: string;
  target: Position;
}
export interface FormationAction {
  type: "FORMATION";
  unitIds: string[]; // 2–6 zusammenhängende Einheiten
  dir: { dc: number; dr: number }; // gemeinsame Richtung (1 Feld)
}
export interface PassAction {
  type: "PASS";
}

export type Action =
  | StepAction
  | StepAttackAction
  | MarchAction
  | MarchAttackAction
  | ShootAction
  | FormationAction
  | PassAction;

/** Kosten (Boten) einer konkreten Aktion — von getLegalActions mitgeliefert. */
export type CostedAction = Exclude<Action, PassAction> & { cost: number };

export type VictoryType = "GENERAL_KILL" | "FORTRESS";

export interface Victory {
  winner: Player;
  type: VictoryType;
}

export interface LogEntry {
  turn: number;
  player: Player;
  text: string;
}

export interface GameState {
  units: Record<string, Unit>;
  currentPlayer: Player;
  messengers: number;
  activatedUnitIds: string[];
  turnNumber: number;
  fortressCounters: Record<Player, number>;
  winner: Victory | null;
  log: LogEntry[];
  rules: RulesConfig;
}
