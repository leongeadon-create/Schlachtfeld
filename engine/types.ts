// engine/types.ts
// Kernmodell für "Das Kompakte Schlachtfeld". Reines, UI-freies Modul.
// State ist immutabel: applyAction erzeugt immer einen neuen State.

import type { RulesConfig } from "./rules.config";

export type Player = "RED" | "BLUE";

export type UnitType =
  | "INFANTRY" // B  — Infanterie
  | "ARCHER" //   S  — Berittene Bogenschützen (Springer + Schuss)
  | "LIGHT_CAV" // L  — Leichte Kavallerie (Läufer/Bishop)
  | "HEAVY_CAV" // T  — Schwere Kavallerie (Turm/Rook)
  | "QUEEN" //    D  — Dame (Elite)
  | "GENERAL"; //  K  — General / HQ

/** Brettposition. col 0..9 (A..J), row 1..13. */
export interface Position {
  col: number;
  row: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  owner: Player;
  hp: number;
  pos: Position;
  /** true, sobald die Einheit ihr Startfeld je verlassen hat (Bauern-Doppelschritt). */
  hasMoved: boolean;
}

export type ActionType =
  | "STEP" //          Schritt: 1 Feld auf leeres Feld
  | "PUSH" //          Stoß: 1 Feld auf Gegner, 2 Schaden, bleibt stehen
  | "MARCH" //         Marsch: Schachmuster auf leeres Feld
  | "MARCH_ATTACK" //  Marschangriff: Schachmuster auf Gegner, 10 Schaden, nimmt Feld
  | "SHOOT" //         Schützen-Schuss: Springer-Muster, 5 Schaden, ignoriert Blockaden
  | "SHOOT_RIDE" //    Nachritt: +1 Bote, weitere 5 Schaden, nimmt Feld
  | "LINE_COMMAND" //  Linienbefehl (V3): 2–4 Bauern je 1 Schritt vor
  | "PASS"; //         Zug beenden

export interface StepAction {
  type: "STEP";
  unitId: string;
  to: Position;
}
export interface PushAction {
  type: "PUSH";
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
export interface ShootRideAction {
  type: "SHOOT_RIDE";
  unitId: string;
  target: Position;
}
export interface LineCommandAction {
  type: "LINE_COMMAND";
  /** Beteiligte Bauern von links nach rechts (2–4). */
  unitIds: string[];
}
export interface PassAction {
  type: "PASS";
}

export type Action =
  | StepAction
  | PushAction
  | MarchAction
  | MarchAttackAction
  | ShootAction
  | ShootRideAction
  | LineCommandAction
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

export interface PendingRide {
  shooterId: string;
  target: Position;
  /** Ziel starb bereits durch den Schuss allein (ANNAHME §6.2). */
  targetAlreadyDead: boolean;
}

export interface GameState {
  units: Record<string, Unit>;
  currentPlayer: Player;
  /** verbleibende Boten im aktuellen Zug */
  messengers: number;
  /** in diesem Zug bereits aktivierte Einheiten */
  activatedUnitIds: string[];
  turnNumber: number;
  /** aufeinanderfolgende Zugenden mit Festungs-Mehrheit */
  fortressCounters: Record<Player, number>;
  pendingRide: PendingRide | null;
  winner: Victory | null;
  log: LogEntry[];
  rules: RulesConfig;
}
