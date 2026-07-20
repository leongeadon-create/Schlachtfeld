// V6 — Generalsmord, Botenbudget, Aktivierung
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { checkVictory } from "../victory";
import { fromAlgebraic } from "../board";
import { build, findAction } from "./helpers";

describe("Generalsmord (§7)", () => {
  it("König auf 0 HP beendet das Spiel", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "rk", type: "GENERAL", owner: "RED", at: "E5", hp: 2 },
    ]);
    const s2 = applyAction(s, findAction(getLegalActions(s, "t"), "STEP_ATTACK", "E5")!);
    expect(s2.units["rk"]).toBeUndefined();
    expect(s2.winner).toEqual({ winner: "BLUE", type: "GENERAL_KILL" });
  });

  it("checkVictory erkennt fehlenden König", () => {
    const s = build([{ id: "bk", type: "GENERAL", owner: "BLUE", at: "A1" }], {
      noAutoGenerals: true,
    });
    expect(checkVictory(s)).toEqual({ winner: "BLUE", type: "GENERAL_KILL" });
  });
});

describe("Botenbudget & Aktivierung (§4)", () => {
  it("bietet keine unbezahlbare Aktion an", () => {
    const s = build([{ id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" }], { messengers: 1 });
    const acts = getLegalActions(s, "t");
    expect(acts.some((a) => a.type === "STEP")).toBe(true); // 1 Bote
    expect(acts.some((a) => a.type === "MARCH")).toBe(false); // 2 Boten
  });

  it("wirft bei zu teurer Aktion", () => {
    const s = build([{ id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" }], { messengers: 1 });
    expect(() => applyAction(s, { type: "MARCH", unitId: "t", to: fromAlgebraic("E8") })).toThrow();
  });

  it("zieht Boten ab und füllt am Zugende auf 8", () => {
    let s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" }]);
    s = applyAction(s, findAction(getLegalActions(s, "b"), "STEP", "E5")!);
    expect(s.messengers).toBe(7);
    s = applyAction(s, { type: "PASS" });
    expect(s.currentPlayer).toBe("RED");
    expect(s.messengers).toBe(8);
  });

  it("jede Einheit nur einmal pro Zug", () => {
    let s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" }]);
    s = applyAction(s, findAction(getLegalActions(s, "b"), "STEP", "E5")!);
    expect(getLegalActions(s, "b")).toHaveLength(0);
    expect(() => applyAction(s, { type: "STEP", unitId: "b", to: fromAlgebraic("E6") })).toThrow();
  });
});

describe("Formationsbefehl (Punkt 8)", () => {
  it("bewegt eine Reihe gemeinsam vor und sperrt alle als Aktivierung", () => {
    let s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "B4" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "C4" },
      { id: "b3", type: "INFANTRY", owner: "BLUE", at: "D4" },
    ]);
    const f = getLegalActions(s, "b1").find(
      (a) => a.type === "FORMATION" && a.dir.dr === 1 && a.dir.dc === 0,
    )!;
    expect(f).toBeDefined();
    s = applyAction(s, f);
    expect(s.units["b1"].pos).toEqual(fromAlgebraic("B5"));
    expect(s.units["b2"].pos).toEqual(fromAlgebraic("C5"));
    expect(s.units["b3"].pos).toEqual(fromAlgebraic("D5"));
    expect(getLegalActions(s, "b2")).toHaveLength(0);
  });

  it("blockierte Einheit greift statt zu ziehen", () => {
    let s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "B4" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "C4" },
      { id: "foe", type: "HEAVY_CAV", owner: "RED", at: "C5", hp: 10 },
    ]);
    const f = getLegalActions(s, "b1").find(
      (a) => a.type === "FORMATION" && a.dir.dr === 1 && a.dir.dc === 0,
    )!;
    s = applyAction(s, f);
    expect(s.units["b1"].pos).toEqual(fromAlgebraic("B5")); // frei -> zieht
    expect(s.units["b2"].pos).toEqual(fromAlgebraic("C4")); // blockiert -> bleibt
    // Bauer gerade = 1, + Umzingelung: b1 steht nach dem Zug neben C5 (2 Nachbarn = +2)
    expect(s.units["foe"].hp).toBe(7);
  });
});
