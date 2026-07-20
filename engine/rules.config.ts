// engine/rules.config.ts
// Alle Regelparameter — inkl. der mit [ANNAHME] markierten Auslegungen aus SPEC.md,
// gekapselt als benannte Flags (§8: "Alle [ANNAHME]-Regeln als benannte Flags").

export interface RulesConfig {
  // Grundwerte
  messengersPerTurn: number; // §4: 8 Boten pro Zug
  maxHp: number; // §3: max/Start 10 HP

  // Schritt & Stoß (§5.1)
  stepCost: number; // 1 Bote
  pushCost: number; // 1 Bote
  pushDamage: number; // 2 Schaden

  // Marsch (§5.2) für L, T, D, S
  marchCost: number; // 2 Boten
  marchAttackDamage: number; // 10 Schaden (tötet immer)
  /** Hausregel: Läufer wird von eigenen Einheiten NICHT blockiert (zieht durch sie
   *  hindurch), von gegnerischen schon — er läuft bis zur ersten gegnerischen Einheit. */
  lightCavPassesOwnUnits: boolean;

  // Infanterie (§6.1)
  pawnMoveCost: number; // 1 Bote für alle Bauern-Schachzüge
  /** [ANNAHME §6.1] Bauern-Diagonalkill kostet nur pawnMoveCost (kosteneffizient, vom Autor gewollt). */
  cheapPawnDiagonalKill: boolean;
  /** [V3] Infanterie zieht/stößt nur vorwärts, seitwärts, diagonal-vorwärts — kein Rückwärts. */
  pawnNoBackwardStep: boolean;
  /** [V3] Schaden des Bauern-Diagonalschlags (5); nur bei Kill rückt der Bauer nach. */
  pawnDiagonalDamage: number;

  // Linienbefehl (§6.7, V3)
  lineCommandEnabled: boolean;
  lineCommandCost: number; // 2 Boten
  lineCommandMaxPawns: number; // 4

  // Passive (§6.7, V3)
  /** [V3] Schildwall: Bauer mit eigenem Bauern direkt links/rechts erleidet -1 aus Stößen. */
  shieldWallEnabled: boolean;
  shieldWallReduction: number; // 1
  /** [V3] Generals-Aura: eigene Einheit auf einem der 8 Felder um den eigenen König: +1 beim Stoß. */
  generalAuraEnabled: boolean;
  generalAuraBonus: number; // 1

  // Berittene Bogenschützen (§6.2)
  shootCost: number; // 1 Bote
  shootDamage: number; // 5 Schaden
  rideCost: number; // +1 Bote (Nachritt)
  rideDamage: number; // weitere 5 Schaden
  /** [ANNAHME §6.2] Nachritt darf aufs frei gewordene Feld, wenn Ziel schon durch Schuss allein starb. */
  rideAfterSoloKill: boolean;
  /** [ANNAHME §6.2] Normaler Springer-Marsch bleibt zusätzlich zur Schuss-Kombi erlaubt. */
  archerMarchEnabled: boolean;
  archerMarchCost: number; // 2 Boten (voller Springer-Marsch)

  // General / HQ (§6.6)
  /** [ANNAHME §6.6] König-Marschangriff (1 Feld, 10 Schaden) aktiv. */
  generalMarchAttackEnabled: boolean;
  generalMarchAttackCost: number; // [ANNAHME] 2 Boten
  generalMarchAttackDamage: number; // 10 Schaden

  // Stoß auf angreifbaren Feldern (§5.1)
  /** [ANNAHME §5.1] Stoß auch dort erlaubt, wo ein Marschangriff möglich wäre (freie Wahl). */
  allowPushOnMarchSquares: boolean;

  // Festung (§7)
  fortressHealAmount: number; // +2 HP zu Zugbeginn auf gegn. Festungsfeld
  fortressHoldTurnsToWin: number; // 3 aufeinanderfolgende Zugenden
  /** [ANNAHME §7] "Mehrheit" = strikt mehr eigene als gegnerische Einheiten auf E/F. */
  fortressMajorityStrict: boolean;
}

export const DEFAULT_RULES: RulesConfig = {
  messengersPerTurn: 8,
  maxHp: 10,

  stepCost: 1,
  pushCost: 1,
  pushDamage: 2,

  marchCost: 2,
  marchAttackDamage: 10,
  lightCavPassesOwnUnits: true,

  pawnMoveCost: 1,
  cheapPawnDiagonalKill: true,
  pawnNoBackwardStep: true,
  pawnDiagonalDamage: 5,

  lineCommandEnabled: true,
  lineCommandCost: 2,
  lineCommandMaxPawns: 4,

  shieldWallEnabled: true,
  shieldWallReduction: 1,
  generalAuraEnabled: true,
  generalAuraBonus: 1,

  shootCost: 1,
  shootDamage: 5,
  rideCost: 1,
  rideDamage: 5,
  rideAfterSoloKill: true,
  archerMarchEnabled: true,
  archerMarchCost: 2,

  generalMarchAttackEnabled: true,
  generalMarchAttackCost: 2,
  generalMarchAttackDamage: 10,

  allowPushOnMarchSquares: true,

  fortressHealAmount: 2,
  fortressHoldTurnsToWin: 3,
  fortressMajorityStrict: true,
};

export function makeRules(overrides: Partial<RulesConfig> = {}): RulesConfig {
  return { ...DEFAULT_RULES, ...overrides };
}
