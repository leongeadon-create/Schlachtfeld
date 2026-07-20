// engine/actions.ts
// Bewegung, Kampf und Schadenssystem (Version 6). Herzstück der Regel-Engine.

import {
  createInitialState,
  enemyFortress,
  forwardDir,
  inBounds,
  isFortress,
  opponent,
  posEq,
  posKey,
  toAlgebraic,
  unitAt,
} from "./board";
import { checkVictory, hasFortressMajority } from "./victory";
import type {
  Action,
  CostedAction,
  FormationAction,
  GameState,
  LogEntry,
  Position,
  Unit,
} from "./types";

export { createInitialState };

// --- Richtungen -------------------------------------------------------------
type Delta = [number, number];
const ORTHO: Delta[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAG: Delta[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const KING: Delta[] = [...ORTHO, ...DIAG];

function add(p: Position, d: Delta): Position {
  return { col: p.col + d[0], row: p.row + d[1] };
}
function chebyshev(a: Position, b: Position): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}
function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

function occupancy(state: GameState): Map<string, Unit> {
  const m = new Map<string, Unit>();
  for (const u of Object.values(state.units)) m.set(posKey(u.pos), u);
  return m;
}

// --- Schadenssystem (§3, V6) ------------------------------------------------
interface AttackContext {
  isShot?: boolean;
  isDiagonalPawnAttack?: boolean;
  charge?: boolean;
}

export function baseAttack(state: GameState, attacker: Unit, ctx: AttackContext): number {
  const r = state.rules;
  if (ctx.isShot) return r.baseAttackArcherShot;
  switch (attacker.type) {
    case "LIGHT_CAV":
      return r.baseAttackLightCav;
    case "HEAVY_CAV":
      return r.baseAttackHeavyCav;
    case "QUEEN":
      return r.baseAttackQueen;
    case "GENERAL":
      return r.baseAttackGeneral;
    case "INFANTRY":
      return ctx.isDiagonalPawnAttack ? r.baseAttackPawnDiagonal : r.baseAttackDefault;
    default:
      return r.baseAttackDefault; // Armbrust-Nahangriff etc.
  }
}

/** Anzahl angreifer-eigener Einheiten, die direkt an das Ziel angrenzen. */
function attackerNeighbors(state: GameState, target: Position, attackerOwner: string): number {
  let n = 0;
  for (const d of KING) {
    const u = unitAt(state, add(target, d));
    if (u && u.owner === attackerOwner) n++;
  }
  return n;
}

/** Steht die Einheit auf einem der 8 Felder um den eigenen König? */
function hasGeneralAura(state: GameState, unit: Unit): boolean {
  const king = Object.values(state.units).find(
    (u) => u.type === "GENERAL" && u.owner === unit.owner,
  );
  if (!king) return false;
  return chebyshev(king.pos, unit.pos) === 1;
}

/** Ziel ist Bauer mit eigenem Bauern direkt links/rechts. */
function pawnHasShieldWall(state: GameState, target: Unit): boolean {
  if (target.type !== "INFANTRY") return false;
  for (const dc of [-1, 1]) {
    const n = unitAt(state, { col: target.pos.col + dc, row: target.pos.row });
    if (n && n.owner === target.owner && n.type === "INFANTRY") return true;
  }
  return false;
}

/**
 * Schadensformel (§3): max(1, Grundangriff[×Charge] + Umzingelung + Aura − Schildwall).
 * Wird ausgewertet, NACHDEM der Angreifer auf sein Angriffsfeld gezogen ist
 * (damit er selbst als Nachbar für die Umzingelung zählt).
 */
export function computeDamage(
  state: GameState,
  attacker: Unit,
  target: Unit,
  ctx: AttackContext,
): number {
  const r = state.rules;
  let base = baseAttack(state, attacker, ctx);
  if (ctx.charge) base *= r.chargeMultiplier;
  const neighbors = attackerNeighbors(state, target.pos, attacker.owner);
  const encircle = Math.max(0, neighbors - 1) * r.encirclementPerExtra;
  const aura = hasGeneralAura(state, attacker) ? r.generalAuraBonus : 0;
  const shield =
    !ctx.isShot && pawnHasShieldWall(state, target) ? r.shieldWallReduction : 0;
  return Math.max(r.minDamage, base + encircle + aura - shield);
}

// --- Legale Aktionen --------------------------------------------------------
export function getLegalActions(state: GameState, unitId: string): CostedAction[] {
  if (state.winner) return [];
  const unit = state.units[unitId];
  if (!unit || unit.owner !== state.currentPlayer) return [];
  if (state.activatedUnitIds.includes(unitId)) return [];

  const out: CostedAction[] = [];
  const occ = occupancy(state);
  const budget = state.messengers;
  const r = state.rules;
  const push = (a: CostedAction) => {
    if (a.cost <= budget) out.push(a);
  };

  const isCav = unit.type === "LIGHT_CAV" || unit.type === "HEAVY_CAV";
  const cavStep = isCav || unit.type === "ARCHER"; // L/T/S dürfen 2-Felder-Schritt
  const fwd = forwardDir(unit.owner);

  // 1) Schritt (Zug auf leeres Feld) + Nahangriff — 1 Feld, jede Richtung.
  for (const d of KING) {
    const to = add(unit.pos, d);
    if (!inBounds(to)) continue;
    const occU = occ.get(posKey(to));
    if (!occU) {
      push({ type: "STEP", unitId, to, cost: r.stepCost });
    } else if (occU.owner !== unit.owner) {
      // Bauer darf nicht rückwärts angreifen.
      if (unit.type === "INFANTRY" && !r.pawnCanAttackBackward && d[1] === -fwd) continue;
      push({ type: "STEP_ATTACK", unitId, target: to, cost: r.stepCost });
    }
  }

  // 2) Kavallerie-Schritt: 2 Felder gerade (L/T/S), Zwischenfeld frei.
  if (cavStep && r.cavStepMax >= 2) {
    for (const d of KING) {
      const mid = add(unit.pos, d);
      const end = add(mid, d);
      if (!inBounds(end) || occ.get(posKey(mid))) continue; // Zwischenfeld muss frei sein
      const occEnd = occ.get(posKey(end));
      if (!occEnd) {
        push({ type: "STEP", unitId, to: end, cost: r.stepCost });
      } else if (occEnd.owner !== unit.owner) {
        push({ type: "STEP_ATTACK", unitId, target: end, cost: r.stepCost });
      }
    }
  }

  // 3) Bauern-Doppelschritt (erster Zug, 2 Felder vor, beide frei).
  if (unit.type === "INFANTRY" && r.pawnDoubleStepEnabled && !unit.hasMoved) {
    const one = { col: unit.pos.col, row: unit.pos.row + fwd };
    const two = { col: unit.pos.col, row: unit.pos.row + 2 * fwd };
    if (inBounds(two) && !occ.get(posKey(one)) && !occ.get(posKey(two))) {
      push({ type: "STEP", unitId, to: two, cost: r.stepCost });
    }
  }

  // 4) Marsch / Marsch-Angriff (L/T/D) — echte Schachlinien, blockiert.
  if (unit.type === "LIGHT_CAV") addSlide(state, unit, occ, DIAG, push);
  else if (unit.type === "HEAVY_CAV") addSlide(state, unit, occ, ORTHO, push);
  else if (unit.type === "QUEEN") addSlide(state, unit, occ, KING, push);

  // 5) Armbrust-Schuss — Ring im Abstand genau 2, über Blockaden hinweg.
  if (unit.type === "ARCHER") {
    for (let dc = -r.archerShootRing; dc <= r.archerShootRing; dc++) {
      for (let dr = -r.archerShootRing; dr <= r.archerShootRing; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== r.archerShootRing) continue;
        const t = { col: unit.pos.col + dc, row: unit.pos.row + dr };
        if (!inBounds(t)) continue;
        const occT = occ.get(posKey(t));
        if (occT && occT.owner !== unit.owner) {
          push({ type: "SHOOT", unitId, target: { ...t }, cost: r.shootCost });
        }
      }
    }
  }

  // 6) Formationsbefehl.
  if (r.formationEnabled) addFormations(state, unit, occ, push);

  return out;
}

// Marsch (leere Felder) + Marsch-Angriff (erste gegnerische Figur) entlang echter Linien.
function addSlide(
  state: GameState,
  unit: Unit,
  occ: Map<string, Unit>,
  dirs: Delta[],
  push: (a: CostedAction) => void,
) {
  const cost = state.rules.marchCost;
  for (const d of dirs) {
    let cur = add(unit.pos, d);
    while (inBounds(cur)) {
      const occU = occ.get(posKey(cur));
      if (!occU) {
        push({ type: "MARCH", unitId: unit.id, to: { ...cur }, cost });
      } else {
        if (occU.owner !== unit.owner) {
          push({ type: "MARCH_ATTACK", unitId: unit.id, target: { ...cur }, cost });
        }
        break; // jede Figur blockiert (kein Überspringen — Läufer-Fix)
      }
      cur = add(cur, d);
    }
  }
}

// Formationsbefehl: zusammenhängende Reihe (waagerecht/senkrecht) ab `unit`,
// gemeinsame 1-Feld-Bewegung in eine der 4 Orthogonalen. Es wird jeweils die
// maximale Gruppe (bis formationMaxUnits) angeboten.
function addFormations(
  state: GameState,
  unit: Unit,
  occ: Map<string, Unit>,
  push: (a: CostedAction) => void,
) {
  const r = state.rules;
  if (r.formationCost > state.messengers) return;
  const orientations: Delta[] = [
    [1, 0], // waagerecht (nach rechts)
    [0, 1], // senkrecht (nach oben)
  ];
  for (const o of orientations) {
    const run: Unit[] = [unit];
    let cur = add(unit.pos, o);
    while (inBounds(cur) && run.length < r.formationMaxUnits) {
      const u = occ.get(posKey(cur));
      if (u && u.owner === unit.owner && !state.activatedUnitIds.includes(u.id)) {
        run.push(u);
        cur = add(cur, o);
      } else break;
    }
    if (run.length < r.formationMinUnits) continue;
    const ids = run.map((u) => u.id);
    for (const dir of ORTHO) {
      if (formationUseful(run, occ, dir)) {
        push({
          type: "FORMATION",
          unitIds: ids,
          dir: { dc: dir[0], dr: dir[1] },
          cost: r.formationCost,
        });
      }
    }
  }
}

function formationUseful(group: Unit[], occ: Map<string, Unit>, dir: Delta): boolean {
  for (const u of group) {
    const to = add(u.pos, dir);
    if (!inBounds(to)) continue;
    const occU = occ.get(posKey(to));
    const backward =
      u.type === "INFANTRY" && dir[1] === -forwardDir(u.owner);
    if (!occU && !backward) return true; // kann ziehen
    if (occU && occU.owner !== u.owner && !(u.type === "INFANTRY" && backward))
      return true; // kann angreifen
  }
  return false;
}

export function getAllLegalActions(state: GameState): Action[] {
  if (state.winner) return [];
  const actions: Action[] = [];
  for (const u of Object.values(state.units)) {
    if (u.owner === state.currentPlayer) actions.push(...getLegalActions(state, u.id));
  }
  actions.push({ type: "PASS" });
  return actions;
}

export function hasAffordableAction(state: GameState): boolean {
  for (const u of Object.values(state.units)) {
    if (u.owner === state.currentPlayer && getLegalActions(state, u.id).length > 0)
      return true;
  }
  return false;
}

// --- Anwendung --------------------------------------------------------------
function cloneState(s: GameState): GameState {
  const units: Record<string, Unit> = {};
  for (const [id, u] of Object.entries(s.units)) units[id] = { ...u, pos: { ...u.pos } };
  return {
    ...s,
    units,
    activatedUnitIds: [...s.activatedUnitIds],
    fortressCounters: { ...s.fortressCounters },
    log: [...s.log],
  };
}

function log(state: GameState, text: string) {
  const entry: LogEntry = { turn: state.turnNumber, player: state.currentPlayer, text };
  state.log.push(entry);
}

function findLegal(
  state: GameState,
  action: Exclude<Action, { type: "PASS" } | { type: "FORMATION" }>,
): CostedAction | undefined {
  return getLegalActions(state, action.unitId).find((a) => {
    if (a.type === "FORMATION") return false;
    if (a.type !== action.type || a.unitId !== action.unitId) return false;
    const aPos = "to" in a ? a.to : a.target;
    const bPos = "to" in action ? action.to : action.target;
    return posEq(aPos, bPos);
  });
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.winner) throw new Error("Spiel ist bereits entschieden.");
  if (action.type === "PASS") return endTurn(state);
  if (action.type === "FORMATION") return applyFormation(state, action);

  const legal = findLegal(state, action);
  if (!legal) {
    const p = "to" in action ? action.to : action.target;
    throw new Error(`Illegale Aktion: ${action.type} ${action.unitId} -> ${toAlgebraic(p)}`);
  }

  const next = cloneState(state);
  const unit = next.units[action.unitId];
  next.messengers -= legal.cost;
  markActivated(next, unit.id);

  switch (action.type) {
    case "STEP": {
      moveUnit(unit, action.to);
      log(next, `${sym(unit)} zieht nach ${toAlgebraic(action.to)}`);
      break;
    }
    case "STEP_ATTACK":
      resolveMeleeAttack(next, unit, action.target);
      break;
    case "MARCH": {
      moveUnit(unit, action.to);
      log(next, `${sym(unit)} marschiert nach ${toAlgebraic(action.to)}`);
      break;
    }
    case "MARCH_ATTACK":
      resolveMarchAttack(next, unit, action.target);
      break;
    case "SHOOT": {
      const target = next.units[unitIdAt(next, action.target)!];
      const dmg = computeDamage(next, unit, target, { isShot: true });
      applyDamage(next, target, dmg);
      log(
        next,
        `${sym(unit)} schießt auf ${toAlgebraic(action.target)} (${dmg} Schaden${
          next.units[target.id] ? "" : ", fällt"
        })`,
      );
      break;
    }
  }

  next.winner = checkVictory(next);
  return next;
}

// Nahangriff (Schritt-Angriff / Kavallerie-Schritt-Angriff).
function resolveMeleeAttack(state: GameState, attacker: Unit, targetPos: Position) {
  const target = state.units[unitIdAt(state, targetPos)!];
  const dist = chebyshev(attacker.pos, targetPos);
  // Kavallerie-Schritt-Angriff über 2 Felder: Angreifer rückt aufs Zwischenfeld.
  if (dist === 2) {
    const dc = sign(targetPos.col - attacker.pos.col);
    const dr = sign(targetPos.row - attacker.pos.row);
    moveUnit(attacker, { col: attacker.pos.col + dc, row: attacker.pos.row + dr });
  }
  const isDiagonalPawnAttack =
    attacker.type === "INFANTRY" &&
    targetPos.col !== attacker.pos.col &&
    targetPos.row - attacker.pos.row === forwardDir(attacker.owner);
  const dmg = computeDamage(state, attacker, target, { isDiagonalPawnAttack });
  applyDamage(state, target, dmg);
  log(
    state,
    `${sym(attacker)} greift ${toAlgebraic(targetPos)} an (${dmg} Schaden${
      state.units[target.id] ? "" : ", fällt"
    })`,
  );
}

// Marsch-Angriff inkl. Kavallerie-Charge, Durchbruch & Lanzendurchstich.
function resolveMarchAttack(state: GameState, attacker: Unit, targetPos: Position) {
  const r = state.rules;
  const origin = { ...attacker.pos };
  const dc = sign(targetPos.col - origin.col);
  const dr = sign(targetPos.row - origin.row);
  const dir: Delta = [dc, dr];
  const target = state.units[unitIdAt(state, targetPos)!];
  const targetHpBefore = target.hp;

  // Angreifer zieht bis aufs letzte freie Feld vor dem Ziel.
  const preTarget = { col: targetPos.col - dc, row: targetPos.row - dr };
  const movedFields = chebyshev(origin, preTarget); // = Distanz Ursprung→Ziel − 1
  if (!posEq(preTarget, origin)) moveUnit(attacker, preTarget);

  const isCav = attacker.type === "LIGHT_CAV" || attacker.type === "HEAVY_CAV";
  const charge = isCav && movedFields >= r.chargeMinMovedFields;

  const dmg = computeDamage(state, attacker, target, { charge });
  const killed = dmg >= targetHpBefore;
  applyDamage(state, target, dmg);
  log(
    state,
    `${sym(attacker)} ${charge ? "chargt" : "marschiert"} auf ${toAlgebraic(
      targetPos,
    )} (${dmg} Schaden${killed ? ", tötet" : ""})`,
  );

  if (!killed) return;

  // Durchbruch nur bei Kavallerie-Charge.
  if (charge && r.lanceBreakthroughEnabled) {
    const overshoot = dmg - targetHpBefore;
    lanceBreakthrough(state, attacker, targetPos, dir, overshoot);
    // Nachrücken 1 Feld, falls das Feld hinter dem Ziel frei ist (oder frei wurde).
    const behind = { col: targetPos.col + dc, row: targetPos.row + dr };
    if (!inBounds(behind) || !unitIdAt(state, behind)) {
      moveUnit(attacker, targetPos);
      log(state, `${sym(attacker)} reitet nach ${toAlgebraic(targetPos)} nieder`);
    }
  }
}

// Lanzendurchstich: Überschuss (−1 je Feld) wird an die Kette dahinter weitergegeben.
function lanceBreakthrough(
  state: GameState,
  attacker: Unit,
  targetPos: Position,
  dir: Delta,
  overshoot: number,
) {
  let momentum = overshoot;
  let field = add(targetPos, dir);
  while (momentum > 0) {
    momentum -= 1; // verlorenes Momentum je Feld
    if (momentum <= 0 || !inBounds(field)) break;
    const occId = unitIdAt(state, field);
    if (!occId) break; // freies Feld stoppt die Kette
    const u = state.units[occId];
    if (u.owner === attacker.owner) break; // kein Friendly Fire
    applyDamage(state, u, momentum);
    log(
      state,
      `Lanzendurchstich trifft ${toAlgebraic(field)} (${momentum} Schaden${
        state.units[occId] ? "" : ", fällt"
      })`,
    );
    field = add(field, dir);
  }
}

function applyFormation(state: GameState, action: FormationAction): GameState {
  const anchor = action.unitIds[0];
  const legal = getLegalActions(state, anchor).find(
    (a) =>
      a.type === "FORMATION" &&
      sameIds(a.unitIds, action.unitIds) &&
      a.dir.dc === action.dir.dc &&
      a.dir.dr === action.dir.dr,
  );
  if (!legal) throw new Error("Illegaler Formationsbefehl.");

  const next = cloneState(state);
  next.messengers -= legal.cost;
  const dir: Delta = [action.dir.dc, action.dir.dr];

  // In Bewegungsrichtung führende Einheiten zuerst verarbeiten (Kolonne rückt nach).
  const order = [...action.unitIds].sort((a, b) => {
    const ua = next.units[a].pos;
    const ub = next.units[b].pos;
    return (ub.col * dir[0] + ub.row * dir[1]) - (ua.col * dir[0] + ua.row * dir[1]);
  });

  let moved = 0;
  let attacks = 0;
  for (const id of order) {
    const u = next.units[id];
    markActivated(next, id);
    const to = add(u.pos, dir);
    const backward = u.type === "INFANTRY" && dir[1] === -forwardDir(u.owner);
    if (!inBounds(to)) continue;
    const occId = unitIdAt(next, to);
    if (!occId) {
      if (!backward) {
        moveUnit(u, to);
        moved++;
      }
    } else {
      const t = next.units[occId];
      if (t.owner !== u.owner && !backward) {
        const isDiagonalPawnAttack = false; // orthogonaler Formationsschub
        const dmg = computeDamage(next, u, t, { isDiagonalPawnAttack });
        applyDamage(next, t, dmg);
        attacks++;
      }
    }
  }
  log(
    next,
    `Formationsbefehl: ${action.unitIds.length} Einheiten (${moved} ziehen, ${attacks} greifen an)`,
  );
  next.winner = checkVictory(next);
  return next;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// --- kleine Helfer ----------------------------------------------------------
function moveUnit(unit: Unit, to: Position) {
  unit.pos = { ...to };
  unit.hasMoved = true;
}
function applyDamage(state: GameState, target: Unit, dmg: number) {
  target.hp -= dmg;
  if (target.hp <= 0) delete state.units[target.id];
}
function markActivated(state: GameState, id: string) {
  if (!state.activatedUnitIds.includes(id)) state.activatedUnitIds.push(id);
}
function unitIdAt(state: GameState, p: Position): string | undefined {
  return unitAt(state, p)?.id;
}
function sym(u: Unit): string {
  const s: Record<Unit["type"], string> = {
    INFANTRY: "B",
    ARCHER: "S",
    LIGHT_CAV: "L",
    HEAVY_CAV: "T",
    QUEEN: "D",
    GENERAL: "K",
  };
  return `${u.owner === "RED" ? "Rot" : "Blau"}-${s[u.type]}`;
}

/**
 * Beendet den Zug (§4, §7): Festungs-Mehrheit auswerten, Sieg prüfen,
 * Spielerwechsel, Boten auffüllen, Heilung auf gegnerischen Festungsfeldern.
 */
export function endTurn(state: GameState): GameState {
  if (state.winner) return state;
  const next = cloneState(state);
  const player = next.currentPlayer;

  if (hasFortressMajority(next, player)) {
    next.fortressCounters[player] += 1;
    log(
      next,
      `Festungs-Mehrheit gehalten (${next.fortressCounters[player]}/${next.rules.fortressHoldTurnsToWin})`,
    );
  } else if (next.fortressCounters[player] !== 0) {
    next.fortressCounters[player] = 0;
    log(next, "Festungs-Mehrheit verloren — Zähler zurückgesetzt");
  }

  next.winner = checkVictory(next);
  if (next.winner) return next;

  const nextPlayer = opponent(player);
  next.currentPlayer = nextPlayer;
  next.messengers = next.rules.messengersPerTurn;
  next.activatedUnitIds = [];
  next.turnNumber += 1;

  const fields = enemyFortress(nextPlayer);
  for (const u of Object.values(next.units)) {
    if (u.owner === nextPlayer && fields.some((f) => posEq(f, u.pos))) {
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + next.rules.fortressHealAmount);
      if (u.hp !== before) log(next, `${sym(u)} heilt auf Festung (${before} -> ${u.hp} HP)`);
    }
  }

  return next;
}

export { checkVictory, isFortress };
