// engine/index.ts
// Öffentliche API der Regel-Engine (§8).

export * from "./types";
export * from "./rules.config";
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
  createInitialState,
  TYPE_TO_SYMBOL,
} from "./board";
export {
  getLegalActions,
  getAllLegalActions,
  hasAffordableAction,
  applyAction,
  endTurn,
  actionCost,
} from "./actions";
export {
  checkVictory,
  findGeneral,
  fortressCounts,
  hasFortressMajority,
} from "./victory";
