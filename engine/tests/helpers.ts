// engine/tests/helpers.ts
// Test-Hilfen: baut beliebige, kompakte Spielzustände (V6).

import { fromAlgebraic, unitMaxHp } from "../board";
import { DEFAULT_RULES, type RulesConfig } from "../rules.config";
import type { CostedAction, GameState, Player, Unit, UnitType } from "../types";

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
  noAutoGenerals?: boolean;
}

export function build(specs: USpec[], opts: BuildOpts = {}): GameState {
  const rules = opts.rules ?? DEFAULT_RULES;
  const units: Record<string, Unit> = {};
  for (const s of specs) {
    const maxHp = unitMaxHp(s.type, rules);
    units[s.id] = {
      id: s.id,
      type: s.type,
      owner: s.owner,
      hp: s.hp ?? maxHp,
      maxHp,
      pos: fromAlgebraic(s.at),
      hasMoved: s.hasMoved ?? false,
    };
  }

  if (!opts.noAutoGenerals) {
    if (!specs.some((s) => s.type === "GENERAL" && s.owner === "RED"))
      units["AUTO_RED_K"] = mkGeneral("AUTO_RED_K", "RED", "A12", rules);
    if (!specs.some((s) => s.type === "GENERAL" && s.owner === "BLUE"))
      units["AUTO_BLUE_K"] = mkGeneral("AUTO_BLUE_K", "BLUE", "A1", rules);
  }

  return {
    units,
    currentPlayer: opts.current ?? "BLUE",
    messengers: opts.messengers ?? rules.messengersPerTurn,
    activatedUnitIds: opts.activated ?? [],
    turnNumber: opts.turnNumber ?? 1,
    fortressCounters: opts.fortressCounters ?? { RED: 0, BLUE: 0 },
    winner: null,
    log: [],
    rules,
  };
}

function mkGeneral(id: string, owner: Player, at: string, rules: RulesConfig): Unit {
  return {
    id,
    type: "GENERAL",
    owner,
    hp: rules.maxHp,
    maxHp: rules.maxHp,
    pos: fromAlgebraic(at),
    hasMoved: false,
  };
}

/** Findet in einer Aktionsliste die Aktion vom Typ mit Ziel/Feld == sq. */
export function findAction(
  actions: CostedAction[],
  type: string,
  sq: string,
): CostedAction | undefined {
  const key = fromAlgebraic(sq);
  return actions.find((a) => {
    if (a.type !== type || a.type === "FORMATION") return false;
    const p = "to" in a ? a.to : a.target;
    return p.col === key.col && p.row === key.row;
  });
}
