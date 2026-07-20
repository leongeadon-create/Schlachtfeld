// engine/actions.ts
// Aktionsgenerierung und -anwendung. Herzstück der Regel-Engine (§4–§7).

import {
  COLS,
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
  GameState,
  LineCommandAction,
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
const KNIGHT: Delta[] = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

function add(p: Position, d: Delta): Position {
  return { col: p.col + d[0], row: p.row + d[1] };
}

// --- Occupancy-Index --------------------------------------------------------
function occupancy(state: GameState): Map<string, Unit> {
  const m = new Map<string, Unit>();
  for (const u of Object.values(state.units)) m.set(posKey(u.pos), u);
  return m;
}

// --- Kostenberechnung -------------------------------------------------------
export function actionCost(state: GameState, unit: Unit, type: Action["type"]): number {
  const r = state.rules;
  switch (type) {
    case "STEP":
      return r.stepCost;
    case "PUSH":
      return r.pushCost;
    case "SHOOT":
      return r.shootCost;
    case "SHOOT_RIDE":
      return r.rideCost;
    case "LINE_COMMAND":
      return r.lineCommandCost;
    case "MARCH":
      if (unit.type === "INFANTRY") return r.pawnMoveCost;
      if (unit.type === "ARCHER") return r.archerMarchCost;
      return r.marchCost;
    case "MARCH_ATTACK":
      if (unit.type === "INFANTRY")
        return r.cheapPawnDiagonalKill ? r.pawnMoveCost : r.marchCost;
      if (unit.type === "GENERAL") return r.generalMarchAttackCost;
      if (unit.type === "ARCHER") return r.archerMarchCost;
      return r.marchCost;
    default:
      return Infinity;
  }
}

// --- Legale Aktionen --------------------------------------------------------

/**
 * Alle aktuell legalen Aktionen einer Einheit (§8: getLegalActions).
 * Berücksichtigt Botenbudget, 1-Aktivierung-pro-Einheit und die Schuss-Kombi-Ausnahme.
 */
export function getLegalActions(state: GameState, unitId: string): CostedAction[] {
  if (state.winner) return [];
  const unit = state.units[unitId];
  if (!unit || unit.owner !== state.currentPlayer) return [];

  const out: CostedAction[] = [];
  const occ = occupancy(state);
  const budget = state.messengers;

  // Ausnahme: offener Nachritt (Schuss-Kombi). Der Schütze ist bereits aktiviert,
  // darf aber unmittelbar den Nachritt aufs selbe Ziel ausführen (§6.2).
  if (state.pendingRide && state.pendingRide.shooterId === unitId) {
    const cost = actionCost(state, unit, "SHOOT_RIDE");
    const soloKillBlocked =
      state.pendingRide.targetAlreadyDead && !state.rules.rideAfterSoloKill;
    if (cost <= budget && !soloKillBlocked) {
      out.push({
        type: "SHOOT_RIDE",
        unitId,
        target: { ...state.pendingRide.target },
        cost,
      });
    }
    return out; // sonst nichts — Schütze ist aktiviert
  }

  // Bereits aktiviert -> keine weiteren Aktionen.
  if (state.activatedUnitIds.includes(unitId)) return out;

  const push = (a: CostedAction) => {
    if (a.cost <= budget) out.push(a);
  };

  // 1) Schritt / Stoß — alle Einheiten, 1 Feld in jede Richtung (§5.1).
  // V3: Infanterie darf nicht rückwärts (auch nicht diagonal-rückwärts).
  const noBack = unit.type === "INFANTRY" && state.rules.pawnNoBackwardStep;
  const fwd = forwardDir(unit.owner);
  for (const d of KING) {
    if (noBack && d[1] === -fwd) continue; // rückwärtige Reihe verboten
    const to = add(unit.pos, d);
    if (!inBounds(to)) continue;
    const occU = occ.get(posKey(to));
    if (!occU) {
      push({ type: "STEP", unitId, to, cost: actionCost(state, unit, "STEP") });
    } else if (occU.owner !== unit.owner) {
      push({
        type: "PUSH",
        unitId,
        target: to,
        cost: actionCost(state, unit, "PUSH"),
      });
    }
  }

  // 2) Typspezifischer Marsch / Marschangriff / Schuss.
  switch (unit.type) {
    case "INFANTRY":
      addPawnActions(state, unit, occ, push);
      addLineCommands(state, unit, occ, push);
      break;
    case "LIGHT_CAV":
      addSlideActions(state, unit, occ, DIAG, push, state.rules.lightCavIgnoresBlockade);
      break;
    case "HEAVY_CAV":
      addSlideActions(state, unit, occ, ORTHO, push);
      break;
    case "QUEEN":
      addSlideActions(state, unit, occ, KING, push);
      break;
    case "ARCHER":
      addArcherActions(state, unit, occ, push);
      break;
    case "GENERAL":
      addGeneralActions(state, unit, occ, push);
      break;
  }

  return out;
}

/** Alle legalen Aktionen des aktuellen Spielers, plus PASS. */
export function getAllLegalActions(state: GameState): Action[] {
  if (state.winner) return [];
  const actions: Action[] = [];
  for (const u of Object.values(state.units)) {
    if (u.owner === state.currentPlayer) {
      actions.push(...getLegalActions(state, u.id));
    }
  }
  actions.push({ type: "PASS" });
  return actions;
}

/** Gibt es außer PASS noch eine bezahlbare Aktion? (§4: Zugende) */
export function hasAffordableAction(state: GameState): boolean {
  for (const u of Object.values(state.units)) {
    if (u.owner === state.currentPlayer && getLegalActions(state, u.id).length > 0) {
      return true;
    }
  }
  return false;
}

// Bauern (§6.1): Doppelschritt (Marsch) + Diagonalschlag (Marschangriff).
// Der einfache Vorwärtsschritt ist bereits durch STEP abgedeckt.
function addPawnActions(
  state: GameState,
  unit: Unit,
  occ: Map<string, Unit>,
  push: (a: CostedAction) => void,
) {
  const fwd = forwardDir(unit.owner);

  // Doppelschritt: nur als erste Bewegung, beide Felder frei (§6.1, §8).
  if (!unit.hasMoved) {
    const one = { col: unit.pos.col, row: unit.pos.row + fwd };
    const two = { col: unit.pos.col, row: unit.pos.row + 2 * fwd };
    if (
      inBounds(one) &&
      inBounds(two) &&
      !occ.has(posKey(one)) &&
      !occ.has(posKey(two))
    ) {
      push({ type: "MARCH", unitId: unit.id, to: two, cost: actionCost(state, unit, "MARCH") });
    }
  }

  // Diagonalschlag vorwärts = Marschangriff (10 Schaden, nimmt Feld).
  for (const dc of [-1, 1]) {
    const t = { col: unit.pos.col + dc, row: unit.pos.row + fwd };
    if (!inBounds(t)) continue;
    const occU = occ.get(posKey(t));
    if (occU && occU.owner !== unit.owner) {
      push({
        type: "MARCH_ATTACK",
        unitId: unit.id,
        target: t,
        cost: actionCost(state, unit, "MARCH_ATTACK"),
      });
    }
  }
}

// Linienbefehl (§6.7, V3): 2–4 horizontal benachbarte eigene Bauern ziehen
// gleichzeitig 1 Feld vor. `unit` ist das linke Ende des Blocks; für jede
// Blockgröße 2..max wird eine Aktion erzeugt (jeder Block genau einmal).
function addLineCommands(
  state: GameState,
  unit: Unit,
  occ: Map<string, Unit>,
  push: (a: CostedAction) => void,
) {
  const r = state.rules;
  if (!r.lineCommandEnabled) return;
  const cost = r.lineCommandCost;
  if (cost > state.messengers) return;

  const fwd = forwardDir(unit.owner);
  // Zusammenhängender Lauf eigener, noch nicht aktivierter Bauern nach rechts.
  const run: Unit[] = [unit];
  for (let c = unit.pos.col + 1; c < COLS; c++) {
    const u = occ.get(posKey({ col: c, row: unit.pos.row }));
    if (
      u &&
      u.owner === unit.owner &&
      u.type === "INFANTRY" &&
      !state.activatedUnitIds.includes(u.id)
    ) {
      run.push(u);
    } else break;
  }

  const maxSize = Math.min(r.lineCommandMaxPawns, run.length);
  for (let size = 2; size <= maxSize; size++) {
    const group = run.slice(0, size);
    const anyMovable = group.some((p) => {
      const f = { col: p.pos.col, row: p.pos.row + fwd };
      return inBounds(f) && !occ.has(posKey(f));
    });
    if (anyMovable) {
      push({ type: "LINE_COMMAND", unitIds: group.map((p) => p.id), cost });
    }
  }
}

// --- Passive (§6.7, V3): Schildwall & Generals-Aura -------------------------

/** Hat der Bauer einen eigenen Bauern direkt links oder rechts? */
function pawnHasShieldWall(state: GameState, unit: Unit): boolean {
  if (unit.type !== "INFANTRY") return false;
  for (const dc of [-1, 1]) {
    const n = unitAt(state, { col: unit.pos.col + dc, row: unit.pos.row });
    if (n && n.owner === unit.owner && n.type === "INFANTRY") return true;
  }
  return false;
}

/** Steht die Einheit auf einem der 8 Felder um den eigenen König? */
function hasGeneralAura(state: GameState, unit: Unit): boolean {
  const general = Object.values(state.units).find(
    (u) => u.type === "GENERAL" && u.owner === unit.owner,
  );
  if (!general) return false;
  const dc = Math.abs(general.pos.col - unit.pos.col);
  const dr = Math.abs(general.pos.row - unit.pos.row);
  return Math.max(dc, dr) === 1;
}

/** Stoßschaden = max(1, 2 + Aura(+1) − Schildwall(−1)) (§5.1, §6.7). */
function computePushDamage(state: GameState, attacker: Unit, target: Unit): number {
  const r = state.rules;
  let dmg = r.pushDamage;
  if (r.generalAuraEnabled && hasGeneralAura(state, attacker)) dmg += r.generalAuraBonus;
  if (r.shieldWallEnabled && pawnHasShieldWall(state, target))
    dmg -= r.shieldWallReduction;
  return Math.max(1, dmg);
}

// Gleitende Figuren (Läufer/Turm/Dame): Linien bis zur Blockade (§5.2).
// ignoreBlockade=true (Hausregel für Läufer): zieht durch Figuren hindurch —
// jedes leere Feld der Linie ist erreichbar, jeder Gegner angreifbar, eigene
// Figuren werden nur übersprungen (kein Landen), nichts stoppt die Linie.
function addSlideActions(
  state: GameState,
  unit: Unit,
  occ: Map<string, Unit>,
  dirs: Delta[],
  push: (a: CostedAction) => void,
  ignoreBlockade = false,
) {
  const marchCost = actionCost(state, unit, "MARCH");
  const attackCost = actionCost(state, unit, "MARCH_ATTACK");
  for (const d of dirs) {
    let cur = add(unit.pos, d);
    while (inBounds(cur)) {
      const occU = occ.get(posKey(cur));
      if (!occU) {
        push({ type: "MARCH", unitId: unit.id, to: { ...cur }, cost: marchCost });
      } else {
        if (occU.owner !== unit.owner) {
          push({
            type: "MARCH_ATTACK",
            unitId: unit.id,
            target: { ...cur },
            cost: attackCost,
          });
        }
        if (!ignoreBlockade) break; // sonst blockiert jede Figur die Linie
      }
      cur = add(cur, d);
    }
  }
}

// Berittene Bogenschützen (§6.2): Schuss + Nachritt-Anbahnung, optional Springer-Marsch.
function addArcherActions(
  state: GameState,
  unit: Unit,
  occ: Map<string, Unit>,
  push: (a: CostedAction) => void,
) {
  const shootCost = actionCost(state, unit, "SHOOT");
  const marchCost = actionCost(state, unit, "MARCH");
  const attackCost = actionCost(state, unit, "MARCH_ATTACK");

  for (const d of KNIGHT) {
    const t = add(unit.pos, d);
    if (!inBounds(t)) continue;
    const occU = occ.get(posKey(t));
    if (occU && occU.owner !== unit.owner) {
      // Schuss: 5 Schaden, ignoriert Blockaden (Springer springt ohnehin).
      push({ type: "SHOOT", unitId: unit.id, target: { ...t }, cost: shootCost });
    }
    // Normaler Springer-Marsch ([ANNAHME §6.2], per Flag).
    if (state.rules.archerMarchEnabled) {
      if (!occU) {
        push({ type: "MARCH", unitId: unit.id, to: { ...t }, cost: marchCost });
      } else if (occU.owner !== unit.owner) {
        push({
          type: "MARCH_ATTACK",
          unitId: unit.id,
          target: { ...t },
          cost: attackCost,
        });
      }
    }
  }
}

// General (§6.6): Marschangriff 1 Feld, 10 Schaden ([ANNAHME], per Flag).
function addGeneralActions(
  state: GameState,
  unit: Unit,
  occ: Map<string, Unit>,
  push: (a: CostedAction) => void,
) {
  if (!state.rules.generalMarchAttackEnabled) return;
  const cost = actionCost(state, unit, "MARCH_ATTACK");
  for (const d of KING) {
    const t = add(unit.pos, d);
    if (!inBounds(t)) continue;
    const occU = occ.get(posKey(t));
    if (occU && occU.owner !== unit.owner) {
      push({ type: "MARCH_ATTACK", unitId: unit.id, target: { ...t }, cost });
    }
  }
}

// --- Anwendung --------------------------------------------------------------

function cloneState(s: GameState): GameState {
  const units: Record<string, Unit> = {};
  for (const [id, u] of Object.entries(s.units)) {
    units[id] = { ...u, pos: { ...u.pos } };
  }
  return {
    ...s,
    units,
    activatedUnitIds: [...s.activatedUnitIds],
    fortressCounters: { ...s.fortressCounters },
    pendingRide: s.pendingRide
      ? { ...s.pendingRide, target: { ...s.pendingRide.target } }
      : null,
    log: [...s.log],
  };
}

function log(state: GameState, text: string) {
  const entry: LogEntry = { turn: state.turnNumber, player: state.currentPlayer, text };
  state.log.push(entry);
}

function findLegal(
  state: GameState,
  action: Exclude<Action, { type: "PASS" } | { type: "LINE_COMMAND" }>,
): CostedAction | undefined {
  const legal = getLegalActions(state, action.unitId);
  return legal.find((a) => {
    if (a.type === "LINE_COMMAND") return false;
    if (a.type !== action.type || a.unitId !== action.unitId) return false;
    const aPos = "to" in a ? a.to : a.target;
    const bPos = "to" in action ? action.to : action.target;
    return posEq(aPos, bPos);
  });
}

/**
 * Wendet eine Aktion an und liefert einen NEUEN State (immutabel).
 * Wirft bei illegalen Aktionen einen Fehler.
 */
export function applyAction(state: GameState, action: Action): GameState {
  if (state.winner) throw new Error("Spiel ist bereits entschieden.");

  if (action.type === "PASS") {
    return endTurn(state);
  }
  if (action.type === "LINE_COMMAND") {
    return applyLineCommand(state, action);
  }

  const legal = findLegal(state, action);
  if (!legal) {
    throw new Error(
      `Illegale Aktion: ${action.type} ${action.unitId} -> ${toAlgebraic(
        "to" in action ? action.to : action.target,
      )}`,
    );
  }

  const next = cloneState(state);
  const unit = next.units[action.unitId];
  next.messengers -= legal.cost;

  const markActivated = () => {
    if (!next.activatedUnitIds.includes(unit.id)) next.activatedUnitIds.push(unit.id);
  };
  const clearRide = () => {
    next.pendingRide = null;
  };

  switch (action.type) {
    case "STEP": {
      moveUnit(unit, action.to);
      markActivated();
      clearRide();
      log(next, `${sym(unit)} Schritt nach ${toAlgebraic(action.to)}`);
      break;
    }
    case "PUSH": {
      const target = next.units[unitIdAt(next, action.target)!];
      const dmg = computePushDamage(next, unit, target); // §5.1/§6.7 Formel
      target.hp -= dmg;
      let extra = "";
      if (target.hp <= 0) {
        removeUnit(next, target.id);
        extra = " (fällt)"; // Feld bleibt frei — kein Nachrücken (§5.1)
      }
      markActivated();
      clearRide();
      log(next, `${sym(unit)} Stoß auf ${toAlgebraic(action.target)} (${dmg} Schaden${extra})`);
      break;
    }
    case "MARCH": {
      moveUnit(unit, action.to);
      markActivated();
      clearRide();
      log(next, `${sym(unit)} Marsch nach ${toAlgebraic(action.to)}`);
      break;
    }
    case "MARCH_ATTACK": {
      const target = next.units[unitIdAt(next, action.target)!];
      if (unit.type === "INFANTRY") {
        // V3: Diagonalschlag 5 Schaden; nur bei Kill rückt der Bauer nach.
        const dmg = next.rules.pawnDiagonalDamage;
        target.hp -= dmg;
        if (target.hp <= 0) {
          removeUnit(next, target.id);
          moveUnit(unit, action.target);
          log(
            next,
            `${sym(unit)} Diagonalschlag auf ${toAlgebraic(action.target)} (${dmg} Schaden, tötet, rückt nach)`,
          );
        } else {
          log(
            next,
            `${sym(unit)} Diagonalschlag auf ${toAlgebraic(action.target)} (${dmg} Schaden, Ziel überlebt)`,
          );
        }
      } else {
        const dmg =
          unit.type === "GENERAL"
            ? next.rules.generalMarchAttackDamage
            : next.rules.marchAttackDamage;
        target.hp -= dmg;
        removeUnit(next, target.id); // 10 Schaden töten immer
        moveUnit(unit, action.target); // nimmt das Feld ein
        log(
          next,
          `${sym(unit)} Marschangriff auf ${toAlgebraic(action.target)} (${dmg} Schaden, tötet)`,
        );
      }
      markActivated();
      clearRide();
      break;
    }
    case "SHOOT": {
      const target = next.units[unitIdAt(next, action.target)!];
      target.hp -= next.rules.shootDamage;
      let dead = false;
      if (target.hp <= 0) {
        removeUnit(next, target.id);
        dead = true;
      }
      markActivated();
      next.pendingRide = {
        shooterId: unit.id,
        target: { ...action.target },
        targetAlreadyDead: dead,
      };
      log(
        next,
        `${sym(unit)} Schuss auf ${toAlgebraic(action.target)} (${next.rules.shootDamage} Schaden${dead ? ", fällt" : ""})`,
      );
      break;
    }
    case "SHOOT_RIDE": {
      const pending = next.pendingRide!;
      const targetId = unitIdAt(next, action.target);
      if (targetId) {
        const target = next.units[targetId];
        target.hp -= next.rules.rideDamage;
        removeUnit(next, target.id); // Schuss(5)+Nachritt(5) = 10 -> tot
      }
      // Wenn Ziel schon durch den Schuss allein starb: nur aufs freie Feld reiten
      // ([ANNAHME §6.2] rideAfterSoloKill).
      moveUnit(unit, action.target);
      clearRide();
      void pending;
      log(next, `${sym(unit)} Nachritt nach ${toAlgebraic(action.target)} (nimmt Feld)`);
      break;
    }
  }

  next.winner = checkVictory(next);
  return next;
}

// Linienbefehl (§6.7, V3): bewegt movable Bauern gleichzeitig 1 Feld vor.
function applyLineCommand(state: GameState, action: LineCommandAction): GameState {
  const anchor = action.unitIds[0];
  const legal = getLegalActions(state, anchor).find(
    (a) => a.type === "LINE_COMMAND" && sameIds(a.unitIds, action.unitIds),
  );
  if (!legal) throw new Error("Illegaler Linienbefehl.");

  const next = cloneState(state);
  next.messengers -= legal.cost;
  const occ = occupancy(next); // Ursprungsbelegung (gleichzeitige Bewegung)
  const owner = next.units[anchor].owner;
  const fwd = forwardDir(owner);

  let moved = 0;
  for (const id of action.unitIds) {
    const p = next.units[id];
    const f = { col: p.pos.col, row: p.pos.row + fwd };
    if (inBounds(f) && !occ.get(posKey(f))) {
      moveUnit(p, f);
      moved++;
    }
    if (!next.activatedUnitIds.includes(id)) next.activatedUnitIds.push(id);
  }
  next.pendingRide = null;
  log(next, `Linienbefehl: ${action.unitIds.length} Bauern (${moved} ziehen vor)`);
  next.winner = checkVictory(next);
  return next;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function moveUnit(unit: Unit, to: Position) {
  unit.pos = { ...to };
  unit.hasMoved = true;
}

function removeUnit(state: GameState, id: string) {
  delete state.units[id];
}

function unitIdAt(state: GameState, p: Position): string | undefined {
  const u = unitAt(state, p);
  return u?.id;
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
 * Beendet den Zug des aktuellen Spielers (§4, §7):
 *  - Festungs-Mehrheit auswerten (Zähler ++ oder Reset)
 *  - Sieg prüfen
 *  - Spielerwechsel, Boten auffüllen, Aktivierungen zurücksetzen
 *  - Heilung auf gegnerischen Festungsfeldern zu Beginn des neuen Zuges
 */
export function endTurn(state: GameState): GameState {
  if (state.winner) return state;
  const next = cloneState(state);
  const player = next.currentPlayer;

  // Festungs-Mehrheit (§7): Zähler für den Spieler, der gerade seinen Zug beendet.
  if (hasFortressMajority(next, player)) {
    next.fortressCounters[player] += 1;
    log(
      next,
      `Festungs-Mehrheit gehalten (${next.fortressCounters[player]}/${next.rules.fortressHoldTurnsToWin})`,
    );
  } else if (next.fortressCounters[player] !== 0) {
    next.fortressCounters[player] = 0;
    log(next, `Festungs-Mehrheit verloren — Zähler zurückgesetzt`);
  }

  next.winner = checkVictory(next);
  if (next.winner) return next;

  // Spielerwechsel.
  const nextPlayer = opponent(player);
  next.currentPlayer = nextPlayer;
  next.messengers = next.rules.messengersPerTurn;
  next.activatedUnitIds = [];
  next.pendingRide = null;
  next.turnNumber += 1;

  // Heilung (§7): eigene Einheiten auf gegnerischem Festungsfeld +2 (max 10).
  const fields = enemyFortress(nextPlayer);
  for (const u of Object.values(next.units)) {
    if (u.owner === nextPlayer && fields.some((f) => posEq(f, u.pos))) {
      const before = u.hp;
      u.hp = Math.min(next.rules.maxHp, u.hp + next.rules.fortressHealAmount);
      if (u.hp !== before) {
        log(next, `${sym(u)} heilt auf Festung (${before} -> ${u.hp} HP)`);
      }
    }
  }

  return next;
}

export { checkVictory, isFortress };
