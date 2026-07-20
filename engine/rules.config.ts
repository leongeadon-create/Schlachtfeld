// engine/rules.config.ts
// Alle Regelparameter für Version 6, als benannte Flags gekapselt (§8).

export interface RulesConfig {
  // Grundwerte
  messengersPerTurn: number; // §4: 8 Boten/Zug
  maxHp: number; // Standard-/Maximal-HP (10)
  archerMaxHp: number; // Armbrustschützen: 6

  // Kosten (§4)
  stepCost: number; // 1 — Schritt, Kavallerie-Schritt, Nahangriff
  marchCost: number; // 2 — Marsch / Marsch-Angriff
  shootCost: number; // 1 — Armbrust-Schuss
  formationCost: number; // 2 — Formationsbefehl

  // Grundangriffe (§3-Schaden, V6)
  baseAttackLightCav: number; // Läufer 2
  baseAttackHeavyCav: number; // Turm 2
  baseAttackArcherShot: number; // Armbrust-Schuss 3
  baseAttackQueen: number; // Dame 4
  baseAttackGeneral: number; // König 4
  baseAttackPawnDiagonal: number; // Bauer Diagonalangriff vorwärts 2
  baseAttackDefault: number; // alle sonstigen Angriffe 1

  // Bonus-Verrechnung (§3)
  encirclementPerExtra: number; // +2 je gegn. Nachbar des Ziels über den ersten hinaus
  generalAuraBonus: number; // +1, Angreifer neben eigenem König
  shieldWallReduction: number; // −1, Ziel-Bauer mit Bauern-Nachbar (nur Nahangriff)
  minDamage: number; // Minimum 1

  // Bewegung (§4)
  cavStepMax: number; // 2 — Kavallerie-Schritt (L/T/S)
  pawnDoubleStepEnabled: boolean; // Bauern-Doppelschritt (erster Zug)
  pawnCanStepBackward: boolean; // Bauer darf rückwärts auf leeres Feld ziehen
  pawnCanAttackBackward: boolean; // Bauer darf NICHT rückwärts angreifen (false)

  // Kavallerie-Charge / Durchbruch (§4, §7-Punkt)
  chargeMinMovedFields: number; // 3 — ab so vielen bewegten freien Feldern doppelt
  chargeMultiplier: number; // 2
  lanceBreakthroughEnabled: boolean; // Durchbruch + Lanzendurchstich

  // Armbrustschützen (§6)
  archerShootRing: number; // 2 — Ring im Chebyshev-Abstand genau 2

  // Formationsbefehl (§8-alt / Punkt 8)
  formationEnabled: boolean;
  formationMinUnits: number; // 2
  formationMaxUnits: number; // 6

  // Festung (§7)
  fortressHealAmount: number; // +2
  fortressHoldTurnsToWin: number; // 3
  fortressMajorityStrict: boolean; // eigene > gegnerische
}

export const DEFAULT_RULES: RulesConfig = {
  messengersPerTurn: 8,
  maxHp: 10,
  archerMaxHp: 6,

  stepCost: 1,
  marchCost: 2,
  shootCost: 1,
  formationCost: 2,

  baseAttackLightCav: 2,
  baseAttackHeavyCav: 2,
  baseAttackArcherShot: 3,
  baseAttackQueen: 4,
  baseAttackGeneral: 4,
  baseAttackPawnDiagonal: 2,
  baseAttackDefault: 1,

  encirclementPerExtra: 2,
  generalAuraBonus: 1,
  shieldWallReduction: 1,
  minDamage: 1,

  cavStepMax: 2,
  pawnDoubleStepEnabled: true,
  pawnCanStepBackward: true,
  pawnCanAttackBackward: false,

  chargeMinMovedFields: 3,
  chargeMultiplier: 2,
  lanceBreakthroughEnabled: true,

  archerShootRing: 2,

  formationEnabled: true,
  formationMinUnits: 2,
  formationMaxUnits: 6,

  fortressHealAmount: 2,
  fortressHoldTurnsToWin: 3,
  fortressMajorityStrict: true,
};

export function makeRules(overrides: Partial<RulesConfig> = {}): RulesConfig {
  return { ...DEFAULT_RULES, ...overrides };
}
