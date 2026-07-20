// V6 — Armbrustschützen (§6)
import { describe, expect, it } from "vitest";
import { getLegalActions } from "../actions";
import { build, findAction } from "./helpers";

const canShoot = (s: ReturnType<typeof build>, id: string, sq: string) =>
  !!findAction(getLegalActions(s, id), "SHOOT", sq);

describe("Armbrust-Schuss (§6)", () => {
  it("trifft nur den Ring im Abstand genau 2, nicht die Nachbarfelder", () => {
    const s = build([
      { id: "a", type: "ARCHER", owner: "BLUE", at: "E5" },
      { id: "ring1", type: "INFANTRY", owner: "RED", at: "G7" }, // Abstand 2
      { id: "ring2", type: "INFANTRY", owner: "RED", at: "E7" }, // Abstand 2
      { id: "ring3", type: "INFANTRY", owner: "RED", at: "F7" }, // Abstand 2 (1,2)
      { id: "near", type: "INFANTRY", owner: "RED", at: "F6" }, // Nachbar = tote Zone
    ]);
    expect(canShoot(s, "a", "G7")).toBe(true);
    expect(canShoot(s, "a", "E7")).toBe(true);
    expect(canShoot(s, "a", "F7")).toBe(true);
    expect(canShoot(s, "a", "F6")).toBe(false); // tote Zone
  });

  it("schießt über Einheiten hinweg (ignoriert Blockade)", () => {
    const s = build([
      { id: "a", type: "ARCHER", owner: "BLUE", at: "E5" },
      { id: "wall", type: "INFANTRY", owner: "BLUE", at: "F5" }, // im Weg
      { id: "foe", type: "INFANTRY", owner: "RED", at: "G5" }, // Abstand 2
    ]);
    expect(canShoot(s, "a", "G5")).toBe(true);
  });

  it("hat 6 HP und keinen vollen Marsch", () => {
    const s = build([{ id: "a", type: "ARCHER", owner: "BLUE", at: "E5" }]);
    expect(s.units["a"].maxHp).toBe(6);
    expect(getLegalActions(s, "a").some((x) => x.type === "MARCH" || x.type === "MARCH_ATTACK")).toBe(false);
  });

  it("kann bewegen ODER schießen (beides als Option verfügbar)", () => {
    const s = build([
      { id: "a", type: "ARCHER", owner: "BLUE", at: "E5" },
      { id: "foe", type: "INFANTRY", owner: "RED", at: "G7" },
    ]);
    const acts = getLegalActions(s, "a");
    expect(acts.some((x) => x.type === "STEP")).toBe(true);
    expect(acts.some((x) => x.type === "SHOOT")).toBe(true);
  });
});
