// V6 — Kavallerie-Charge, Durchbruch & Lanzendurchstich (§4, Punkt 7)
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { fromAlgebraic } from "../board";
import { build, findAction } from "./helpers";

function marchAttack(s: ReturnType<typeof build>, id: string, sq: string) {
  return applyAction(s, findAction(getLegalActions(s, id), "MARCH_ATTACK", sq)!);
}

describe("Kavallerie-Charge (§4)", () => {
  it("2 bewegte Felder = einfacher Grundangriff", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E2" },
      { id: "e", type: "QUEEN", owner: "RED", at: "E5", hp: 10 },
    ]);
    const s2 = marchAttack(s, "t", "E5"); // zieht E3,E4 -> greift E5 an
    expect(s2.units["e"].hp).toBe(8); // Basis 2, keine Charge
    expect(s2.units["t"].pos).toEqual(fromAlgebraic("E4"));
  });

  it("3 bewegte Felder = doppelter Grundangriff", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E2" },
      { id: "e", type: "QUEEN", owner: "RED", at: "E6", hp: 10 },
    ]);
    const s2 = marchAttack(s, "t", "E6"); // zieht E3,E4,E5 -> Charge
    expect(s2.units["e"].hp).toBe(6); // 2×2 = 4
  });

  it("Dame chargt NICHT (nur L/T)", () => {
    const s = build([
      { id: "d", type: "QUEEN", owner: "BLUE", at: "E2" },
      { id: "e", type: "HEAVY_CAV", owner: "RED", at: "E6", hp: 10 },
    ]);
    const s2 = marchAttack(s, "d", "E6");
    expect(s2.units["e"].hp).toBe(6); // Dame-Basis 4, nicht verdoppelt
  });
});

describe("Durchbruch & Lanzendurchstich (Punkt 7)", () => {
  it("freies Feld hinter dem Ziel → Kavallerie rückt nach", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E2" },
      { id: "e", type: "HEAVY_CAV", owner: "RED", at: "E6", hp: 3 }, // stirbt an Charge (4)
    ]);
    const s2 = marchAttack(s, "t", "E6");
    expect(s2.units["e"]).toBeUndefined();
    expect(s2.units["t"].pos).toEqual(fromAlgebraic("E6")); // nachgerückt
  });

  it("Gegner dahinter: Überschuss −1 wird weitergereicht (Kette)", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E2" },
      { id: "e1", type: "HEAVY_CAV", owner: "RED", at: "E6", hp: 1 }, // Charge 4, Überschuss 3
      { id: "e2", type: "HEAVY_CAV", owner: "RED", at: "E7", hp: 10 },
      { id: "e3", type: "HEAVY_CAV", owner: "RED", at: "E8", hp: 10 },
    ]);
    const s2 = marchAttack(s, "t", "E6");
    expect(s2.units["e1"]).toBeUndefined();
    expect(s2.units["e2"].hp).toBe(8); // 3-1 = 2 Schaden
    expect(s2.units["e3"].hp).toBe(9); // 2-1 = 1 Schaden
    expect(s2.units["t"].pos).toEqual(fromAlgebraic("E5")); // E7 blockiert -> kein Nachrücken
  });

  it("Kette stoppt an eigener Einheit (kein Friendly Fire)", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E2" },
      { id: "e1", type: "HEAVY_CAV", owner: "RED", at: "E6", hp: 1 },
      { id: "e2", type: "HEAVY_CAV", owner: "RED", at: "E7", hp: 10 },
      { id: "friend", type: "INFANTRY", owner: "BLUE", at: "E8", hp: 10 },
    ]);
    const s2 = marchAttack(s, "t", "E6");
    expect(s2.units["e2"].hp).toBe(8); // 2 Schaden
    expect(s2.units["friend"].hp).toBe(10); // unversehrt
  });

  it("wird das Feld hinter dem Ziel durch die Kette frei → Nachrücken", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E2" },
      { id: "e1", type: "HEAVY_CAV", owner: "RED", at: "E6", hp: 1 }, // Überschuss 3
      { id: "e2", type: "HEAVY_CAV", owner: "RED", at: "E7", hp: 2 }, // 2 Schaden -> stirbt
    ]);
    const s2 = marchAttack(s, "t", "E6");
    expect(s2.units["e1"]).toBeUndefined();
    expect(s2.units["e2"]).toBeUndefined(); // durch Kette getötet
    expect(s2.units["t"].pos).toEqual(fromAlgebraic("E6")); // trotzdem nachgerückt
  });

  it("Durchbruch nur bei Charge, nicht bei kurzem Marsch-Angriff", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "e", type: "HEAVY_CAV", owner: "RED", at: "E5", hp: 1 }, // adjazent, kein Charge
    ]);
    const s2 = marchAttack(s, "t", "E5");
    expect(s2.units["e"]).toBeUndefined();
    expect(s2.units["t"].pos).toEqual(fromAlgebraic("E4")); // bleibt, kein Nachrücken
  });
});
