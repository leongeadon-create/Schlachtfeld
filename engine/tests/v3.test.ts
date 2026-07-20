// V3 — Bauern-Richtung, Diagonalschlag 5, Linienbefehl, Schildwall, Generals-Aura
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { fromAlgebraic, toAlgebraic } from "../board";
import { makeRules } from "../rules.config";
import { build } from "./helpers";
import type { CostedAction } from "../types";

function stepTargets(actions: CostedAction[]): string[] {
  return actions
    .filter((a): a is Extract<CostedAction, { type: "STEP" }> => a.type === "STEP")
    .map((a) => toAlgebraic(a.to));
}

function lineCmds(actions: CostedAction[]) {
  return actions.filter(
    (a): a is Extract<CostedAction, { type: "LINE_COMMAND" }> => a.type === "LINE_COMMAND",
  );
}

function pushOn(state: ReturnType<typeof build>, unitId: string, sq: string) {
  return getLegalActions(state, unitId).find(
    (a) => a.type === "PUSH" && toAlgebraic(a.target) === sq,
  )!;
}

// --- ÄNDERUNG 1: Bauern-Richtung -------------------------------------------
describe("Bauern-Richtung (V3)", () => {
  it("blauer Bauer zieht vorwärts/seitwärts/diagonal-vorwärts, nicht rückwärts", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E5" }]);
    const t = stepTargets(getLegalActions(s, "b"));
    // erlaubt
    for (const sq of ["E6", "D5", "F5", "D6", "F6"]) expect(t).toContain(sq);
    // verboten (rückwärts, diagonal-rückwärts)
    for (const sq of ["E4", "D4", "F4"]) expect(t).not.toContain(sq);
  });

  it("roter Bauer hat invertierte Vorwärtsrichtung", () => {
    const s = build([{ id: "r", type: "INFANTRY", owner: "RED", at: "E7" }], {
      current: "RED",
    });
    const t = stepTargets(getLegalActions(s, "r"));
    expect(t).toContain("E6"); // vor (abwärts)
    expect(t).not.toContain("E8"); // zurück
  });

  it("Bauer kann nicht rückwärts stoßen", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E5" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "E4" }, // hinter dem Bauern
    ]);
    expect(getLegalActions(s, "b").some((a) => a.type === "PUSH")).toBe(false);
  });
});

// --- ÄNDERUNG 2: Diagonalschlag 5 Schaden ----------------------------------
describe("Bauern-Diagonalschlag 5 Schaden (V3)", () => {
  it("tötet Ziel mit ≤5 HP und rückt nach", () => {
    let s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F5", hp: 5 },
    ]);
    s = applyAction(s, getLegalActions(s, "b").find((a) => a.type === "MARCH_ATTACK")!);
    expect(s.units["e"]).toBeUndefined();
    expect(s.units["b"].pos).toEqual(fromAlgebraic("F5")); // nachgerückt
  });

  it("lässt überlebendes Ziel stehen; Bauer bleibt an Ort", () => {
    let s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F5", hp: 8 },
    ]);
    s = applyAction(s, getLegalActions(s, "b").find((a) => a.type === "MARCH_ATTACK")!);
    expect(s.units["e"].hp).toBe(3);
    expect(s.units["b"].pos).toEqual(fromAlgebraic("E4"));
  });
});

// --- ÄNDERUNG 3: Linienbefehl ----------------------------------------------
describe("Linienbefehl (V3)", () => {
  it("bewegt benachbarte Bauern gleichzeitig 1 Feld vor", () => {
    let s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "B4" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "C4" },
      { id: "b3", type: "INFANTRY", owner: "BLUE", at: "D4" },
    ]);
    const cmds = lineCmds(getLegalActions(s, "b1"));
    expect(cmds.map((a) => a.unitIds.length).sort()).toEqual([2, 3]);
    const three = cmds.find((a) => a.unitIds.length === 3)!;
    expect(three.cost).toBe(2);
    s = applyAction(s, three);
    expect(s.units["b1"].pos).toEqual(fromAlgebraic("B5"));
    expect(s.units["b2"].pos).toEqual(fromAlgebraic("C5"));
    expect(s.units["b3"].pos).toEqual(fromAlgebraic("D5"));
    expect(s.messengers).toBe(6);
  });

  it("teilblockierte Linie: blockierte Bauern bleiben, Rest zieht, kein Angriff", () => {
    let s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "B4" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "C4" },
      { id: "b3", type: "INFANTRY", owner: "BLUE", at: "D4" },
      { id: "block", type: "INFANTRY", owner: "RED", at: "C5", hp: 10 },
    ]);
    const three = lineCmds(getLegalActions(s, "b1")).find((a) => a.unitIds.length === 3)!;
    s = applyAction(s, three);
    expect(s.units["b1"].pos).toEqual(fromAlgebraic("B5"));
    expect(s.units["b2"].pos).toEqual(fromAlgebraic("C4")); // blockiert
    expect(s.units["b3"].pos).toEqual(fromAlgebraic("D5"));
    expect(s.units["block"].hp).toBe(10); // kein Angriff
  });

  it("sperrt alle beteiligten Bauern als Aktivierung", () => {
    let s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "B4" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "C4" },
    ]);
    s = applyAction(s, lineCmds(getLegalActions(s, "b1"))[0]);
    expect(getLegalActions(s, "b1")).toHaveLength(0);
    expect(getLegalActions(s, "b2")).toHaveLength(0);
    expect(s.activatedUnitIds.sort()).toEqual(["b1", "b2"]);
  });

  it("nur 2–4 Bauern; einzelner Bauer bietet keinen, fünf sind auf 4 gedeckelt", () => {
    const single = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" }]);
    expect(lineCmds(getLegalActions(single, "b"))).toHaveLength(0);

    const s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "B4" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "C4" },
      { id: "b3", type: "INFANTRY", owner: "BLUE", at: "D4" },
      { id: "b4", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "b5", type: "INFANTRY", owner: "BLUE", at: "F4" },
    ]);
    const sizes = lineCmds(getLegalActions(s, "b1")).map((a) => a.unitIds.length);
    expect(Math.max(...sizes)).toBe(4);
  });

  it("kostet 2 Boten und entfällt bei zu wenig Boten", () => {
    const s = build(
      [
        { id: "b1", type: "INFANTRY", owner: "BLUE", at: "B4" },
        { id: "b2", type: "INFANTRY", owner: "BLUE", at: "C4" },
      ],
      { messengers: 1 },
    );
    expect(lineCmds(getLegalActions(s, "b1"))).toHaveLength(0);
  });
});

// --- ÄNDERUNG 4: Schildwall -------------------------------------------------
describe("Schildwall (V3)", () => {
  it("-1 Stoßschaden bei horizontalem eigenem Bauern-Nachbarn", () => {
    const s = build(
      [
        { id: "t", type: "INFANTRY", owner: "BLUE", at: "E4", hp: 10 },
        { id: "ally", type: "INFANTRY", owner: "BLUE", at: "D4" },
        { id: "a", type: "INFANTRY", owner: "RED", at: "E5" },
      ],
      { current: "RED" },
    );
    expect(applyAction(s, pushOn(s, "a", "E4")).units["t"].hp).toBe(9); // 2-1
  });

  it("kein Schildwall bei vertikalem Nachbarn", () => {
    const s = build(
      [
        { id: "t", type: "INFANTRY", owner: "BLUE", at: "E4", hp: 10 },
        { id: "below", type: "INFANTRY", owner: "BLUE", at: "E3" },
        { id: "a", type: "INFANTRY", owner: "RED", at: "E5" },
      ],
      { current: "RED" },
    );
    expect(applyAction(s, pushOn(s, "a", "E4")).units["t"].hp).toBe(8);
  });

  it("Nachbar muss eine Infanterie sein", () => {
    const s = build(
      [
        { id: "t", type: "INFANTRY", owner: "BLUE", at: "E4", hp: 10 },
        { id: "cav", type: "LIGHT_CAV", owner: "BLUE", at: "D4" },
        { id: "a", type: "INFANTRY", owner: "RED", at: "E5" },
      ],
      { current: "RED" },
    );
    expect(applyAction(s, pushOn(s, "a", "E4")).units["t"].hp).toBe(8);
  });

  it("schützt nicht gegen Diagonalschlag", () => {
    const s = build(
      [
        { id: "t", type: "INFANTRY", owner: "BLUE", at: "E4", hp: 10 },
        { id: "ally", type: "INFANTRY", owner: "BLUE", at: "D4" },
        { id: "a", type: "INFANTRY", owner: "RED", at: "F5" },
      ],
      { current: "RED" },
    );
    const atk = getLegalActions(s, "a").find(
      (x) => x.type === "MARCH_ATTACK" && toAlgebraic(x.target) === "E4",
    )!;
    expect(applyAction(s, atk).units["t"].hp).toBe(5); // 5, nicht 4
  });

  it("Stoßschaden-Minimum ist 1", () => {
    const s = build(
      [
        { id: "t", type: "INFANTRY", owner: "BLUE", at: "E4", hp: 10 },
        { id: "ally", type: "INFANTRY", owner: "BLUE", at: "D4" },
        { id: "a", type: "INFANTRY", owner: "RED", at: "E5" },
      ],
      { current: "RED", rules: makeRules({ shieldWallReduction: 5 }) },
    );
    expect(applyAction(s, pushOn(s, "a", "E4")).units["t"].hp).toBe(9); // clamp auf 1
  });
});

// --- ÄNDERUNG 5: Generals-Aura ---------------------------------------------
describe("Generals-Aura (V3)", () => {
  it("+1 Stoßschaden nahe eigenem König", () => {
    const s = build([
      { id: "k", type: "GENERAL", owner: "BLUE", at: "E3" },
      { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "t", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
    ]);
    expect(applyAction(s, pushOn(s, "a", "E5")).units["t"].hp).toBe(7); // 2+1
  });

  it("keine Aura fern des eigenen Königs", () => {
    const s = build([
      { id: "k", type: "GENERAL", owner: "BLUE", at: "A1" },
      { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "t", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
    ]);
    expect(applyAction(s, pushOn(s, "a", "E5")).units["t"].hp).toBe(8);
  });

  it("gegnerischer König spendet keine Aura", () => {
    const s = build(
      [
        { id: "rk", type: "GENERAL", owner: "RED", at: "E3" },
        { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" },
        { id: "t", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
        { id: "bk", type: "GENERAL", owner: "BLUE", at: "A1" },
      ],
      { noAutoGenerals: true },
    );
    expect(applyAction(s, pushOn(s, "a", "E5")).units["t"].hp).toBe(8);
  });

  it("Aura wirkt nicht auf Diagonalschlag", () => {
    const s = build([
      { id: "k", type: "GENERAL", owner: "BLUE", at: "E3" },
      { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "t", type: "INFANTRY", owner: "RED", at: "F5", hp: 10 },
    ]);
    const atk = getLegalActions(s, "a").find(
      (x) => x.type === "MARCH_ATTACK" && toAlgebraic(x.target) === "F5",
    )!;
    expect(applyAction(s, atk).units["t"].hp).toBe(5); // 5, keine Aura
  });
});

// --- VERRECHNUNG: Aura + Schildwall ----------------------------------------
describe("Stoßschaden-Formel (V3)", () => {
  it("Aura(+1) und Schildwall(−1) ergeben zusammen wieder 2", () => {
    const s = build([
      { id: "k", type: "GENERAL", owner: "BLUE", at: "E3" },
      { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" }, // Aura +1
      { id: "t", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
      { id: "ally", type: "INFANTRY", owner: "RED", at: "D5" }, // Schildwall -1
    ]);
    expect(applyAction(s, pushOn(s, "a", "E5")).units["t"].hp).toBe(8); // 2+1-1=2
  });
});
