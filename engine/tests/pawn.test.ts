// §6.1 — Infanterie: Doppelschritt, Diagonalschlag
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { fromAlgebraic, toAlgebraic } from "../board";
import { build } from "./helpers";

function has(actions: ReturnType<typeof getLegalActions>, type: string, sq: string) {
  return actions.some((a) => {
    if (a.type !== type || a.type === "LINE_COMMAND") return false;
    return toAlgebraic("to" in a ? a.to : a.target) === sq;
  });
}

describe("Bauern-Doppelschritt (§6.1, §8)", () => {
  it("erlaubt Doppelschritt nur als erste Bewegung", () => {
    const fresh = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E3" }]);
    expect(has(getLegalActions(fresh, "b"), "MARCH", "E5")).toBe(true);

    const moved = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E3", hasMoved: true },
    ]);
    expect(has(getLegalActions(moved, "b"), "MARCH", "E5")).toBe(false);
  });

  it("setzt hasMoved und verbietet danach den Doppelschritt", () => {
    let s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E3" }]);
    s = applyAction(s, { type: "STEP", unitId: "b", to: fromAlgebraic("E4") });
    expect(s.units["b"].hasMoved).toBe(true);
    // frische Aktivierung, aber hasMoved bleibt
    s = { ...s, activatedUnitIds: [], messengers: 8 };
    expect(has(getLegalActions(s, "b"), "MARCH", "E6")).toBe(false);
  });

  it("Doppelschritt blockiert, wenn ein Feld belegt ist", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E3" },
      { id: "x", type: "INFANTRY", owner: "RED", at: "E5" },
    ]);
    expect(has(getLegalActions(s, "b"), "MARCH", "E5")).toBe(false);
  });

  it("kostet 1 Boten", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E3" }]);
    const m = getLegalActions(s, "b").find((a) => a.type === "MARCH")!;
    expect(m.cost).toBe(1);
  });
});

describe("Bauern-Diagonalschlag (§6.1, V3)", () => {
  it("Diagonalschlag vorwärts kostet 1 Boten und macht 5 Schaden", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F5", hp: 10 },
    ]);
    const atk = getLegalActions(s, "b").find((a) => a.type === "MARCH_ATTACK")!;
    expect(atk.cost).toBe(1);
    const s2 = applyAction(s, atk);
    expect(s2.units["e"].hp).toBe(5); // überlebt
    expect(s2.units["b"].pos).toEqual(fromAlgebraic("E4")); // bleibt stehen
  });

  it("kein Marschangriff geradeaus — nur Stoß möglich", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
    ]);
    const acts = getLegalActions(s, "b");
    expect(acts.some((a) => a.type === "MARCH_ATTACK")).toBe(false);
    expect(has(acts, "PUSH", "E5")).toBe(true);
    // Geradeaus-Schritt blockiert (Feld belegt)
    expect(has(acts, "STEP", "E5")).toBe(false);
  });

  it("kein Stoß und kein Schlag rückwärts-diagonal (V3)", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F3", hp: 10 },
    ]);
    const acts = getLegalActions(s, "b");
    expect(acts.some((a) => a.type === "MARCH_ATTACK")).toBe(false);
    expect(has(acts, "PUSH", "F3")).toBe(false); // rückwärts verboten
  });
});
