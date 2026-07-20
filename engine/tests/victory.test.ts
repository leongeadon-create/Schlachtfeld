// §7 — Generalsmord
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { checkVictory } from "../victory";
import { build } from "./helpers";
import { fromAlgebraic } from "../board";

describe("Generalsmord (§7 Weg 1)", () => {
  it("Marschangriff auf den gegnerischen General beendet das Spiel", () => {
    const s = build(
      [
        { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
        { id: "rk", type: "GENERAL", owner: "RED", at: "E7", hp: 10 },
        { id: "bk", type: "GENERAL", owner: "BLUE", at: "A1" },
      ],
      { noAutoGenerals: true },
    );
    const atk = getLegalActions(s, "t").find(
      (a) => a.type === "MARCH_ATTACK" && a.target.row === 7,
    )!;
    const s2 = applyAction(s, atk);
    expect(s2.units["rk"]).toBeUndefined();
    expect(s2.winner).toEqual({ winner: "BLUE", type: "GENERAL_KILL" });
  });

  it("General fällt auch durch wiederholte Stöße (2 Schaden)", () => {
    let s = build(
      [
        { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
        { id: "rk", type: "GENERAL", owner: "RED", at: "E5", hp: 2 },
        { id: "bk", type: "GENERAL", owner: "BLUE", at: "A1" },
      ],
      { noAutoGenerals: true },
    );
    const push = getLegalActions(s, "b").find((a) => a.type === "PUSH")!;
    s = applyAction(s, push);
    expect(s.units["rk"]).toBeUndefined();
    expect(s.winner).toEqual({ winner: "BLUE", type: "GENERAL_KILL" });
  });

  it("keine Aktionen mehr nach Spielende", () => {
    const s = build(
      [
        { id: "b", type: "INFANTRY", owner: "BLUE", at: "E4" },
        { id: "bk", type: "GENERAL", owner: "BLUE", at: "A1" },
      ],
      { noAutoGenerals: true },
    );
    // Kein roter General -> Blau hat bereits gewonnen.
    expect(checkVictory(s)).toEqual({ winner: "BLUE", type: "GENERAL_KILL" });
    expect(() =>
      applyAction({ ...s, winner: checkVictory(s) }, { type: "STEP", unitId: "b", to: fromAlgebraic("E5") }),
    ).toThrow();
  });
});
