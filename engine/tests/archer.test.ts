// §6.2 — Berittene Bogenschützen: Schuss, Nachritt, Schuss durch Blockaden
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { fromAlgebraic, toAlgebraic } from "../board";
import { build } from "./helpers";
import { makeRules } from "../rules.config";

describe("Schützen-Schuss (§6.2)", () => {
  it("Schuss trifft im Springer-Muster für 5 Schaden, Schütze bleibt stehen", () => {
    const s = build([
      { id: "s", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F6", hp: 10 },
    ]);
    const shoot = getLegalActions(s, "s").find((a) => a.type === "SHOOT")!;
    expect(shoot.cost).toBe(1);
    const s2 = applyAction(s, shoot);
    expect(s2.units["e"].hp).toBe(5);
    expect(s2.units["s"].pos).toEqual(fromAlgebraic("E4")); // bleibt stehen
    expect(s2.messengers).toBe(7);
  });

  it("Schuss ignoriert Blockaden (§6.2)", () => {
    const s = build([
      { id: "s", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "wall1", type: "INFANTRY", owner: "BLUE", at: "E5" },
      { id: "wall2", type: "INFANTRY", owner: "RED", at: "F5" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F6", hp: 10 },
    ]);
    const shots = getLegalActions(s, "s")
      .filter((a) => a.type === "SHOOT")
      .map((a) => toAlgebraic((a as any).target));
    expect(shots).toContain("F6"); // trotz Mauer ringsum
  });
});

describe("Schützen-Nachritt (§6.2)", () => {
  it("Nachritt zählt als dieselbe Aktivierung, kostet +1, tötet und nimmt Feld", () => {
    let s = build([
      { id: "s", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F6", hp: 10 },
    ]);
    s = applyAction(s, getLegalActions(s, "s").find((a) => a.type === "SHOOT")!);
    // Nach dem Schuss ist der Schütze aktiviert — nur der Nachritt bleibt legal.
    const after = getLegalActions(s, "s");
    expect(after).toHaveLength(1);
    expect(after[0].type).toBe("SHOOT_RIDE");
    s = applyAction(s, after[0]);
    expect(s.units["e"]).toBeUndefined();
    expect(s.units["s"].pos).toEqual(fromAlgebraic("F6")); // nimmt Feld
    expect(s.messengers).toBe(6); // 8 - 1 (Schuss) - 1 (Nachritt)
    expect(s.activatedUnitIds).toEqual(["s"]); // eine Aktivierung
  });

  it("Nachritt nur nach eigenem Schuss aufs selbe Ziel (§6.2, §8)", () => {
    // Ohne vorherigen Schuss: kein Nachritt.
    const fresh = build([{ id: "s", type: "ARCHER", owner: "BLUE", at: "E4" }]);
    expect(getLegalActions(fresh, "s").some((a) => a.type === "SHOOT_RIDE")).toBe(false);
    expect(() =>
      applyAction(fresh, { type: "SHOOT_RIDE", unitId: "s", target: fromAlgebraic("F6") }),
    ).toThrow();

    // Nach Schuss auf F6: Nachritt nur auf F6, nicht auf ein anderes Feld.
    let s = build([
      { id: "s", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F6", hp: 10 },
    ]);
    s = applyAction(s, getLegalActions(s, "s").find((a) => a.type === "SHOOT")!);
    expect(() =>
      applyAction(s, { type: "SHOOT_RIDE", unitId: "s", target: fromAlgebraic("G5") }),
    ).toThrow();
  });

  it("fremde Einheit darf den Nachritt nicht ausführen (§6.2)", () => {
    let s = build([
      { id: "s", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "s2", type: "ARCHER", owner: "BLUE", at: "H4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F6", hp: 10 },
    ]);
    s = applyAction(s, getLegalActions(s, "s").find((a) => a.type === "SHOOT")!);
    expect(getLegalActions(s, "s2").some((a) => a.type === "SHOOT_RIDE")).toBe(false);
    expect(() =>
      applyAction(s, { type: "SHOOT_RIDE", unitId: "s2", target: fromAlgebraic("F6") }),
    ).toThrow();
  });

  it("Nachritt aufs freie Feld, wenn Ziel schon durch den Schuss stirbt [ANNAHME]", () => {
    let s = build([
      { id: "s", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "F6", hp: 5 }, // stirbt am Schuss
    ]);
    s = applyAction(s, getLegalActions(s, "s").find((a) => a.type === "SHOOT")!);
    expect(s.units["e"]).toBeUndefined(); // schon tot
    const ride = getLegalActions(s, "s").find((a) => a.type === "SHOOT_RIDE")!;
    expect(ride).toBeDefined();
    s = applyAction(s, ride);
    expect(s.units["s"].pos).toEqual(fromAlgebraic("F6"));
  });

  it("Flag rideAfterSoloKill=false verbietet den Nachritt aufs freie Feld", () => {
    let s = build(
      [
        { id: "s", type: "ARCHER", owner: "BLUE", at: "E4" },
        { id: "e", type: "INFANTRY", owner: "RED", at: "F6", hp: 5 },
      ],
      { rules: makeRules({ rideAfterSoloKill: false }) },
    );
    s = applyAction(s, getLegalActions(s, "s").find((a) => a.type === "SHOOT")!);
    expect(getLegalActions(s, "s").some((a) => a.type === "SHOOT_RIDE")).toBe(false);
  });
});

describe("Springer-Marsch des Schützen (§6.2 [ANNAHME])", () => {
  it("kann auf leeres Feld marschieren (2 Boten)", () => {
    const s = build([{ id: "s", type: "ARCHER", owner: "BLUE", at: "E4" }]);
    const march = getLegalActions(s, "s").filter((a) => a.type === "MARCH");
    expect(march.length).toBeGreaterThan(0);
    expect(march.every((a) => a.cost === 2)).toBe(true);
  });
});
