// §4 — Botenbudget & 1-Aktivierung-pro-Einheit
import { describe, expect, it } from "vitest";
import { applyAction, endTurn, getLegalActions, hasAffordableAction } from "../actions";
import { build } from "./helpers";

describe("Botenbudget-Grenzen (§4)", () => {
  it("bietet keine unbezahlbare Aktion an", () => {
    const s = build([{ id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" }], {
      messengers: 1,
    });
    const acts = getLegalActions(s, "l");
    expect(acts.some((a) => a.type === "STEP")).toBe(true); // 1 Bote
    expect(acts.some((a) => a.type === "MARCH")).toBe(false); // 2 Boten, nicht leistbar
  });

  it("wirft bei zu teurer Aktion", () => {
    const s = build([{ id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" }], {
      messengers: 1,
    });
    expect(() =>
      applyAction(s, { type: "MARCH", unitId: "l", to: { col: 5, row: 5 } }),
    ).toThrow();
  });

  it("zieht Boten korrekt ab und füllt am Zugende auf 8 (§4)", () => {
    let s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" }]);
    s = applyAction(s, getLegalActions(s, "b").find((a) => a.type === "STEP")!);
    expect(s.messengers).toBe(7);
    s = endTurn(s); // ungenutzte Boten verfallen
    expect(s.currentPlayer).toBe("RED");
    expect(s.messengers).toBe(8);
  });

  it("meldet Zugende, wenn keine bezahlbare Aktion existiert (§4)", () => {
    const s = build([{ id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" }], {
      messengers: 0,
    });
    expect(hasAffordableAction(s)).toBe(false);
    expect(getLegalActions(s, "l")).toHaveLength(0);
  });
});

describe("1-Aktivierung-pro-Einheit (§4)", () => {
  it("erlaubt einer Einheit nur eine Aktivierung pro Zug", () => {
    let s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" }]);
    s = applyAction(s, getLegalActions(s, "b").find((a) => a.type === "STEP")!);
    expect(getLegalActions(s, "b")).toHaveLength(0);
    expect(() =>
      applyAction(s, { type: "STEP", unitId: "b", to: { col: 4, row: 6 } }),
    ).toThrow();
  });

  it("aktiviert eine zweite Einheit unabhängig", () => {
    let s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "G4" },
    ]);
    s = applyAction(s, getLegalActions(s, "b1").find((a) => a.type === "STEP")!);
    expect(getLegalActions(s, "b2").length).toBeGreaterThan(0);
  });
});
