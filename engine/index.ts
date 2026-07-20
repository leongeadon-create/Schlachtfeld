// engine/index.ts
// Öffentliche API der Regel-Engine (§8).

export * from "./types";
export * from "./rules.config";
export {
  SETUP_PRESETS,
  DEFAULT_SETUP,
  SETUP_V6,
  type SetupName,
  type SetupRow,
} from "./setup.config";
export {
  COLS,
  ROWS,
  RED_FORTRESS,
  BLUE_FORTRESS,
  enemyFortress,
  opponent,
  forwardDir,
  inBounds,
  posEq,
  posKey,
  toAlgebraic,
  fromAlgebraic,
  unitAt,
  isFortress,
  unitMaxHp,
  createInitialState,
  TYPE_TO_SYMBOL,
} from "./board";
export {
  getLegalActions,
  getAllLegalActions,
  hasAffordableAction,
  applyAction,
  endTurn,
  baseAttack,
  computeDamage,
} from "./actions";
export {
  checkVictory,
  findGeneral,
  fortressCounts,
  hasFortressMajority,
} from "./victory";
