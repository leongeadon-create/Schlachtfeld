// §2, §3 — Brett & Startaufstellung
import { describe, expect, it } from "vitest";
import { createInitialState } from "../board";
import type { UnitType } from "../types";

function count(state: ReturnType<typeof createInitialState>, owner: "RED" | "BLUE", type: UnitType) {
  return Object.values(state.units).filter((u) => u.owner === owner && u.type === type).length;
}

describe("Startaufstellung", () => {
  const s = createInitialState();

  it("hat pro Spieler die korrekte Einheitenzahl (§3)", () => {
    for (const owner of ["RED", "BLUE"] as const) {
      expect(count(s, owner, "INFANTRY")).toBe(16);
      expect(count(s, owner, "ARCHER")).toBe(4);
      expect(count(s, owner, "LIGHT_CAV")).toBe(4);
      expect(count(s, owner, "HEAVY_CAV")).toBe(4);
      expect(count(s, owner, "QUEEN")).toBe(1);
      expect(count(s, owner, "GENERAL")).toBe(1);
    }
  });

  it("startet mit 10 HP für alle Einheiten (§3)", () => {
    expect(Object.values(s.units).every((u) => u.hp === 10)).toBe(true);
  });

  it("platziert die Generäle auf den Festungsfeldern E1/E13 (§2)", () => {
    const blueK = Object.values(s.units).find((u) => u.type === "GENERAL" && u.owner === "BLUE")!;
    const redK = Object.values(s.units).find((u) => u.type === "GENERAL" && u.owner === "RED")!;
    expect(blueK.pos).toEqual({ col: 4, row: 1 }); // E1
    expect(redK.pos).toEqual({ col: 4, row: 13 }); // E13
  });

  it("lässt A/J-Flanken und Reihen 5–9 leer (§2)", () => {
    const occupied = new Set(Object.values(s.units).map((u) => `${u.pos.col},${u.pos.row}`));
    for (let row = 5; row <= 9; row++) {
      for (let col = 0; col < 10; col++) {
        expect(occupied.has(`${col},${row}`)).toBe(false);
      }
    }
    for (const u of Object.values(s.units)) {
      expect(u.pos.col).not.toBe(0); // A
      expect(u.pos.col).not.toBe(9); // J
    }
  });

  it("Blau (unten) beginnt mit 8 Boten (§4)", () => {
    expect(s.currentPlayer).toBe("BLUE");
    expect(s.messengers).toBe(8);
  });
});
