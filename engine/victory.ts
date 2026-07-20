// engine/victory.ts
// Siegbedingungen (§7): Generalsmord und Festung.

import { enemyFortress, opponent, posEq } from "./board";
import type { GameState, Player, Unit, Victory } from "./types";

export function findGeneral(state: GameState, owner: Player): Unit | undefined {
  return Object.values(state.units).find(
    (u) => u.type === "GENERAL" && u.owner === owner,
  );
}

/** Anzahl eigener vs. gegnerischer Einheiten auf den gegnerischen Festungsfeldern. */
export function fortressCounts(
  state: GameState,
  player: Player,
): { own: number; enemy: number } {
  const fields = enemyFortress(player);
  let own = 0;
  let enemy = 0;
  for (const u of Object.values(state.units)) {
    if (fields.some((f) => posEq(f, u.pos))) {
      if (u.owner === player) own++;
      else enemy++;
    }
  }
  return { own, enemy };
}

/** Hält `player` die Mehrheit auf den gegnerischen Festungsfeldern? (§7, [ANNAHME]) */
export function hasFortressMajority(state: GameState, player: Player): boolean {
  const { own, enemy } = fortressCounts(state, player);
  if (state.rules.fortressMajorityStrict) return own > enemy;
  return own >= enemy && own > 0;
}

/**
 * Reine Prüfung des Siegzustands (§7). Prüft Generalsmord und Festungszähler.
 * Gibt den Sieger zurück oder null.
 */
export function checkVictory(state: GameState): Victory | null {
  const redGeneral = findGeneral(state, "RED");
  const blueGeneral = findGeneral(state, "BLUE");
  if (!blueGeneral) return { winner: "RED", type: "GENERAL_KILL" };
  if (!redGeneral) return { winner: "BLUE", type: "GENERAL_KILL" };

  const need = state.rules.fortressHoldTurnsToWin;
  if (state.fortressCounters.RED >= need) return { winner: "RED", type: "FORTRESS" };
  if (state.fortressCounters.BLUE >= need)
    return { winner: "BLUE", type: "FORTRESS" };

  return null;
}

export { opponent };
