// §5, §6 — Schritt/Stoß, Marsch/Marschangriff, Blockaden
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { fromAlgebraic, toAlgebraic, unitAt } from "../board";
import { build } from "./helpers";
import { makeRules } from "../rules.config";
import type { CostedAction } from "../types";

function targets(actions: CostedAction[], type: string): string[] {
  return actions
    .filter((a) => a.type === type)
    .map((a) => toAlgebraic("to" in a ? a.to : a.target))
    .sort();
}

describe("Schritt & Stoß (§5.1)", () => {
  it("Schritt bewegt 1 Feld auf ein leeres Feld für 1 Boten", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" }]);
    const step = getLegalActions(s, "b").find((a) => a.type === "STEP" && toAlgebraic((a as any).to) === "E5")!;
    expect(step.cost).toBe(1);
    const s2 = applyAction(s, step);
    expect(unitAt(s2, fromAlgebraic("E5"))?.id).toBe("b");
    expect(s2.messengers).toBe(7);
  });

  it("Stoß macht 2 Schaden und die Einheit bleibt stehen (§5.1)", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "r", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
    ]);
    const push = getLegalActions(s, "b").find((a) => a.type === "PUSH")!;
    expect(push.cost).toBe(1);
    const s2 = applyAction(s, push);
    expect(s2.units["r"].hp).toBe(8);
    expect(s2.units["b"].pos).toEqual(fromAlgebraic("E4")); // bleibt stehen
  });

  it("Stoß-Kill lässt das Feld frei — kein Nachrücken (§5.1)", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "r", type: "INFANTRY", owner: "RED", at: "E5", hp: 2 },
    ]);
    const push = getLegalActions(s, "b").find((a) => a.type === "PUSH")!;
    const s2 = applyAction(s, push);
    expect(s2.units["r"]).toBeUndefined();
    expect(unitAt(s2, fromAlgebraic("E5"))).toBeUndefined(); // Feld bleibt frei
    expect(s2.units["b"].pos).toEqual(fromAlgebraic("E4"));
  });

  it("5× Frontal-Stoß tötet den Bauern (Autor-Beispiel: 5×2=10)", () => {
    let s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4", hp: 10 },
      { id: "r", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
    ]);
    for (let i = 0; i < 5; i++) {
      const push = getLegalActions(s, "b").find((a) => a.type === "PUSH")!;
      s = applyAction(s, push);
      // frische Aktivierung simulieren (nur diese Einheit)
      s = { ...s, activatedUnitIds: [], messengers: 8 };
    }
    expect(s.units["r"]).toBeUndefined();
  });
});

describe("Marsch & Blockade (§5.2)", () => {
  it("Läufer zieht volle Diagonalen für 2 Boten", () => {
    const s = build([{ id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" }]);
    const march = getLegalActions(s, "l").filter((a) => a.type === "MARCH");
    expect(march.every((a) => a.cost === 2)).toBe(true);
    const t = targets(march, "MARCH");
    expect(t).toContain("F5");
    expect(t).toContain("H7"); // weit entfernt, frei
    expect(t).toContain("D3");
  });

  it("Läufer zieht diagonal durch Figuren hindurch (Hausregel)", () => {
    const s = build([
      { id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" },
      { id: "own", type: "INFANTRY", owner: "BLUE", at: "F5" }, // eigene Figur auf Diagonale
      { id: "foe", type: "INFANTRY", owner: "RED", at: "G6" }, // Gegner dahinter
    ]);
    const acts = getLegalActions(s, "l");
    const march = targets(acts, "MARCH");
    const atk = targets(acts, "MARCH_ATTACK");
    expect(march).not.toContain("F5"); // eigenes Feld: kein Landen
    expect(atk).toContain("G6"); // Gegner hinter eigener Figur angreifbar
    expect(march).toContain("H7"); // hinter dem Gegner weiter (durch)
  });

  it("Turm zieht gerade Linien, blockiert durch eigene Figur (§5.2)", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "own", type: "INFANTRY", owner: "BLUE", at: "E7" },
    ]);
    const t = targets(getLegalActions(s, "t"), "MARCH");
    expect(t).toContain("E5");
    expect(t).toContain("E6");
    expect(t).not.toContain("E7"); // eigenes Feld
    expect(t).not.toContain("E8"); // dahinter blockiert
  });

  it("Marschangriff auf erste gegnerische Figur, nicht dahinter (§5.2)", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "E7" },
      { id: "e2", type: "INFANTRY", owner: "RED", at: "E9" },
    ]);
    const acts = getLegalActions(s, "t");
    const atk = targets(acts, "MARCH_ATTACK");
    expect(atk).toContain("E7");
    expect(atk).not.toContain("E9"); // hinter Blockade
    const march = targets(acts, "MARCH");
    expect(march).not.toContain("E8");
  });

  it("Marschangriff macht 10 Schaden, tötet und nimmt das Feld ein (§5.2)", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "E7", hp: 10 },
    ]);
    const atk = getLegalActions(s, "t").find((a) => a.type === "MARCH_ATTACK")!;
    expect(atk.cost).toBe(2);
    const s2 = applyAction(s, atk);
    expect(s2.units["e"]).toBeUndefined();
    expect(s2.units["t"].pos).toEqual(fromAlgebraic("E7")); // nimmt Feld
  });

  it("Dame kombiniert gerade + diagonale Linien (§6.5)", () => {
    const s = build([{ id: "d", type: "QUEEN", owner: "BLUE", at: "E7" }]);
    const t = targets(getLegalActions(s, "d"), "MARCH");
    expect(t).toContain("E11"); // gerade
    expect(t).toContain("A3"); // diagonal
    expect(t).toContain("I11"); // diagonal
  });
});

describe("General (§6.6)", () => {
  it("König-Marschangriff macht 10 Schaden für 2 Boten [ANNAHME]", () => {
    const s = build([
      { id: "k", type: "GENERAL", owner: "BLUE", at: "E5" },
      { id: "r", type: "INFANTRY", owner: "RED", at: "E6", hp: 10 },
    ]);
    const acts = getLegalActions(s, "k");
    const push = acts.find((a) => a.type === "PUSH")!;
    const march = acts.find((a) => a.type === "MARCH_ATTACK")!;
    expect(push.cost).toBe(1); // billiger Stoß bleibt möglich (§5.1 [ANNAHME])
    expect(march.cost).toBe(2);
    const s2 = applyAction(s, march);
    expect(s2.units["r"]).toBeUndefined();
    expect(s2.units["k"].pos).toEqual(fromAlgebraic("E6"));
  });

  it("König-Marschangriff kann per Flag deaktiviert werden", () => {
    const s = build(
      [
        { id: "k", type: "GENERAL", owner: "BLUE", at: "E5" },
        { id: "r", type: "INFANTRY", owner: "RED", at: "E6" },
      ],
      { rules: makeRules({ generalMarchAttackEnabled: false }) },
    );
    expect(getLegalActions(s, "k").some((a) => a.type === "MARCH_ATTACK")).toBe(false);
  });
});
