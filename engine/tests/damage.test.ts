// V6 — Schadensformel (§3): Grundangriffe, Umzingelung, Aura, Schildwall, Minimum
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { build, findAction } from "./helpers";

// Führt genau eine Aktion aus und gibt die Rest-HP des Ziels zurück (0 = tot).
function dmgTo(state: ReturnType<typeof build>, attackerId: string, type: string, sq: string, targetId: string) {
  const action = findAction(getLegalActions(state, attackerId), type, sq)!;
  const s2 = applyAction(state, action);
  return s2.units[targetId]?.hp ?? 0;
}

describe("Grundangriffe (§3)", () => {
  it("Läufer und Turm: 2", () => {
    for (const t of ["LIGHT_CAV", "HEAVY_CAV"] as const) {
      const s = build([
        { id: "a", type: t, owner: "BLUE", at: "E4" },
        { id: "t", type: "QUEEN", owner: "RED", at: "E5", hp: 10 },
      ]);
      expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(8); // 10-2
    }
  });

  it("Dame und König: 4", () => {
    for (const t of ["QUEEN", "GENERAL"] as const) {
      const s = build([
        { id: "a", type: t, owner: "BLUE", at: "E4" },
        { id: "t", type: "HEAVY_CAV", owner: "RED", at: "E5", hp: 10 },
      ]);
      expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(6); // 10-4
    }
  });

  it("Armbrust-Schuss: 3", () => {
    const s = build([
      { id: "a", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "t", type: "HEAVY_CAV", owner: "RED", at: "G6", hp: 10 },
    ]);
    expect(dmgTo(s, "a", "SHOOT", "G6", "t")).toBe(7); // 10-3, Abstand 2
  });

  it("Bauer: Diagonalangriff vorwärts 2, sonst 1", () => {
    const diag = build([
      { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "t", type: "HEAVY_CAV", owner: "RED", at: "F5", hp: 10 },
    ]);
    expect(dmgTo(diag, "a", "STEP_ATTACK", "F5", "t")).toBe(8); // 10-2

    const straight = build([
      { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" },
      { id: "t", type: "HEAVY_CAV", owner: "RED", at: "E5", hp: 10 },
    ]);
    expect(dmgTo(straight, "a", "STEP_ATTACK", "E5", "t")).toBe(9); // 10-1
  });

  it("Armbrust-Nahangriff: 1 (sonstiger Angriff)", () => {
    const s = build([
      { id: "a", type: "ARCHER", owner: "BLUE", at: "E4" },
      { id: "t", type: "HEAVY_CAV", owner: "RED", at: "E5", hp: 10 },
    ]);
    expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(9); // 10-1
  });
});

describe("Umzingelung (§3)", () => {
  const target = { id: "t", type: "QUEEN" as const, owner: "RED" as const, at: "E5", hp: 10 };
  const atk = { id: "a", type: "LIGHT_CAV" as const, owner: "BLUE" as const, at: "E4" }; // Basis 2

  it("2 Nachbarn = +2", () => {
    const s = build([atk, target, { id: "n1", type: "INFANTRY", owner: "BLUE", at: "D5" }]);
    expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(6); // 10-(2+2)
  });

  it("3 Nachbarn = +4", () => {
    const s = build([
      atk,
      target,
      { id: "n1", type: "INFANTRY", owner: "BLUE", at: "D5" },
      { id: "n2", type: "INFANTRY", owner: "BLUE", at: "F5" },
    ]);
    expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(4); // 10-(2+4)
  });

  it("4 Nachbarn = +6", () => {
    const s = build([
      atk,
      target,
      { id: "n1", type: "INFANTRY", owner: "BLUE", at: "D5" },
      { id: "n2", type: "INFANTRY", owner: "BLUE", at: "F5" },
      { id: "n3", type: "INFANTRY", owner: "BLUE", at: "E6" },
    ]);
    expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(2); // 10-(2+6)
  });
});

describe("Aura & Schildwall (§3)", () => {
  it("Aura +1 neben eigenem König", () => {
    const s = build([
      { id: "k", type: "GENERAL", owner: "BLUE", at: "E3" },
      { id: "a", type: "LIGHT_CAV", owner: "BLUE", at: "E4" }, // Basis 2 + Aura 1
      { id: "t", type: "QUEEN", owner: "RED", at: "E5", hp: 10 },
    ]);
    expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(7); // 10-3
  });

  it("Schildwall −1 gegen Nahangriff", () => {
    const s = build([
      { id: "a", type: "LIGHT_CAV", owner: "BLUE", at: "E4" }, // Basis 2
      { id: "t", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
      { id: "ally", type: "INFANTRY", owner: "RED", at: "D5" }, // Schildwall-Nachbar
    ]);
    expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(9); // 10-(2-1)
  });

  it("Schildwall gilt NICHT gegen Schüsse", () => {
    const s = build([
      { id: "a", type: "ARCHER", owner: "BLUE", at: "C4" }, // Basis 3, Abstand 2 zu E5
      { id: "t", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
      { id: "ally", type: "INFANTRY", owner: "RED", at: "D5" },
    ]);
    expect(dmgTo(s, "a", "SHOOT", "E5", "t")).toBe(7); // 10-3 (kein Schildwall)
  });

  it("Minimum 1", () => {
    const s = build([
      { id: "a", type: "INFANTRY", owner: "BLUE", at: "E4" }, // Basis 1 (gerade)
      { id: "t", type: "INFANTRY", owner: "RED", at: "E5", hp: 10 },
      { id: "ally", type: "INFANTRY", owner: "RED", at: "D5" }, // Schildwall −1
    ]);
    expect(dmgTo(s, "a", "STEP_ATTACK", "E5", "t")).toBe(9); // max(1, 1-1)=1
  });
});
