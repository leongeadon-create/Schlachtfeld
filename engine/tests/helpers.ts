// engine/tests/helpers.ts
// Test-Hilfen: baut beliebige, kompakte Spielzustände.
// (Keine *.test.ts-Datei — wird von Vitest nicht als Test geladen.)

import { fromAlgebraic } from "../board";
import { DEFAULT_RULES, type RulesConfig } from "../rules.config";
import type { GameState, Player, Unit, UnitType } from "../types";

export interface USpec {
  id: string;
  type: UnitType;
  owner: Player;
  at: string; // algebraisch, z.B. "E4"
  hp?: number;
  hasMoved?: boolean;
}

export interface BuildOpts {
  current?: Player;
  messengers?: number;
  rules?: RulesConfig;
  activated?: string[];
  fortressCounters?: Record<Player, number>;
  turnNumber?: number;
  /** Auto-Generäle unterdrücken (Standard: an, damit checkVictory nicht sofort feuert). */
  noAutoGenerals?: boolean;
}

/**
 * Baut einen State aus einer Liste von Einheiten. Fügt fehlende Generäle
 * automatisch weit außerhalb (A-Linie) hinzu, damit kein sofortiger
 * Generalsmord-Sieg entsteht.
 */
export function build(specs: USpec[], opts: BuildOpts = {}): GameState {
  const rules = opts.rules ?? DEFAULT_RULES;
  const units: Record<string, Unit> = {};
  for (const s of specs) {
    units[s.id] = {
      id: s.id,
      type: s.type,
      owner: s.owner,
      hp: s.hp ?? rules.maxHp,
      pos: fromAlgebraic(s.at),
      hasMoved: s.hasMoved ?? false,
    };
  }

  if (!opts.noAutoGenerals) {
    const hasRedK = specs.some((s) => s.type === "GENERAL" && s.owner === "RED");
    const hasBlueK = specs.some((s) => s.type === "GENERAL" && s.owner === "BLUE");
    if (!hasRedK) {
      units["AUTO_RED_K"] = mkGeneral("AUTO_RED_K", "RED", "A13", rules.maxHp);
    }
    if (!hasBlueK) {
      units["AUTO_BLUE_K"] = mkGeneral("AUTO_BLUE_K", "BLUE", "A1", rules.maxHp);
    }
  }

  return {
    units,
    currentPlayer: opts.current ?? "BLUE",
    messengers: opts.messengers ?? rules.messengersPerTurn,
    activatedUnitIds: opts.activated ?? [],
    turnNumber: opts.turnNumber ?? 1,
    fortressCounters: opts.fortressCounters ?? { RED: 0, BLUE: 0 },
    pendingRide: null,
    winner: null,
    log: [],
    rules,
  };
}

function mkGeneral(id: string, owner: Player, at: string, hp: number): Unit {
  return { id, type: "GENERAL", owner, hp, pos: fromAlgebraic(at), hasMoved: false };
}

export function unitById(state: GameState, id: string): Unit | undefined {
  return state.units[id];
}
