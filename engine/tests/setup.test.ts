// V6 — Brett & Startaufstellung (§2, §3)
import { describe, expect, it } from "vitest";
import { COLS, ROWS, createInitialState, fromAlgebraic, unitAt } from "../board";
import type { GameState, Player, UnitType } from "../types";

function typeAt(s: GameState, sq: string): UnitType | null {
  return unitAt(s, fromAlgebraic(sq))?.type ?? null;
}
function count(s: GameState, owner: Player, type: UnitType) {
  return Object.values(s.units).filter((u) => u.owner === owner && u.type === type).length;
}

describe("Brettmaße & Aufstellung (V6)", () => {
  const s = createInitialState();

  it("Brett ist 10×12", () => {
    expect(COLS).toBe(10);
    expect(ROWS).toBe(12);
  });

  it("korrekte Einheitenzahl pro Spieler (§3)", () => {
    for (const owner of ["RED", "BLUE"] as const) {
      expect(count(s, owner, "INFANTRY")).toBe(16);
      expect(count(s, owner, "ARCHER")).toBe(4);
      expect(count(s, owner, "LIGHT_CAV")).toBe(4);
      expect(count(s, owner, "HEAVY_CAV")).toBe(4);
      expect(count(s, owner, "QUEEN")).toBe(1);
      expect(count(s, owner, "GENERAL")).toBe(1);
    }
  });

  it("HP: alle 10, Armbrustschützen 6", () => {
    for (const u of Object.values(s.units)) {
      expect(u.hp).toBe(u.maxHp);
      expect(u.maxHp).toBe(u.type === "ARCHER" ? 6 : 10);
    }
  });

  it("Blau auf 1–4, Rot auf 9–12, Niemandsland 5–8 leer", () => {
    const occ = new Set(Object.values(s.units).map((u) => `${u.pos.col},${u.pos.row}`));
    for (let row = 5; row <= 8; row++)
      for (let col = 0; col < 10; col++) expect(occ.has(`${col},${row}`)).toBe(false);
    for (const u of Object.values(s.units)) {
      if (u.owner === "BLUE") expect(u.pos.row).toBeLessThanOrEqual(4);
      else expect(u.pos.row).toBeGreaterThanOrEqual(9);
    }
  });

  it("König E, Dame F auf der Festungsreihe (D–G)", () => {
    expect(typeAt(s, "E1")).toBe("GENERAL");
    expect(typeAt(s, "F1")).toBe("QUEEN");
    expect(typeAt(s, "E12")).toBe("GENERAL");
    expect(typeAt(s, "F12")).toBe("QUEEN");
  });

  it("Grundreihe: Türme B/C/H/I, Läufer B/E/F/I, Armbrust C/D/G/H", () => {
    for (const c of ["B", "C", "H", "I"]) expect(typeAt(s, `${c}1`)).toBe("HEAVY_CAV");
    for (const c of ["B", "E", "F", "I"]) expect(typeAt(s, `${c}2`)).toBe("LIGHT_CAV");
    for (const c of ["C", "D", "G", "H"]) expect(typeAt(s, `${c}2`)).toBe("ARCHER");
    for (const c of ["B", "C", "D", "E", "F", "G", "H", "I"]) {
      expect(typeAt(s, `${c}3`)).toBe("INFANTRY");
      expect(typeAt(s, `${c}4`)).toBe("INFANTRY");
    }
  });

  it("Blau beginnt mit 8 Boten", () => {
    expect(s.currentPlayer).toBe("BLUE");
    expect(s.messengers).toBe(8);
  });
});
