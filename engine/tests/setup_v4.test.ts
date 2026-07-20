// V4 — Neue Startaufstellung (ÄNDERUNG A/B)
import { describe, expect, it } from "vitest";
import { createInitialState } from "../board";
import { getLegalActions } from "../actions";
import { fromAlgebraic, toAlgebraic, unitAt } from "../board";
import { DEFAULT_RULES } from "../rules.config";
import type { GameState, Player, UnitType } from "../types";

function typeAt(s: GameState, sq: string): UnitType | null {
  return unitAt(s, fromAlgebraic(sq))?.type ?? null;
}
function ownerAt(s: GameState, sq: string): Player | null {
  return unitAt(s, fromAlgebraic(sq))?.owner ?? null;
}
function pawnCount(s: GameState, owner: Player): number {
  return Object.values(s.units).filter(
    (u) => u.owner === owner && u.type === "INFANTRY",
  ).length;
}

describe("V4-Startaufstellung", () => {
  const s = createInitialState();

  it("hat 12 Bauern pro Spieler", () => {
    expect(pawnCount(s, "RED")).toBe(12);
    expect(pawnCount(s, "BLUE")).toBe(12);
  });

  it("Rot: hintere Bauernreihe 9 (B–I) voll, vordere Reihe 8 nur C/E/F/H", () => {
    for (const c of ["B", "C", "D", "E", "F", "G", "H", "I"]) {
      expect(typeAt(s, `${c}9`)).toBe("INFANTRY");
    }
    for (const c of ["C", "E", "F", "H"]) {
      expect(typeAt(s, `${c}8`)).toBe("INFANTRY");
    }
    for (const c of ["A", "B", "D", "G", "I", "J"]) {
      expect(typeAt(s, `${c}8`)).toBeNull();
    }
  });

  it("Blau: hintere Bauernreihe 3 (B–I) voll, vordere Reihe 4 nur C/E/F/H", () => {
    for (const c of ["B", "C", "D", "E", "F", "G", "H", "I"]) {
      expect(typeAt(s, `${c}3`)).toBe("INFANTRY");
    }
    for (const c of ["C", "E", "F", "H"]) {
      expect(typeAt(s, `${c}4`)).toBe("INFANTRY");
    }
    for (const c of ["A", "B", "D", "G", "I", "J"]) {
      expect(typeAt(s, `${c}4`)).toBeNull();
    }
  });

  it("äußere Läufer stehen auf den Flanken A/J, B/I sind frei", () => {
    // Rot (Reihe 10)
    expect(typeAt(s, "A10")).toBe("LIGHT_CAV");
    expect(typeAt(s, "J10")).toBe("LIGHT_CAV");
    expect(typeAt(s, "B10")).toBeNull();
    expect(typeAt(s, "I10")).toBeNull();
    // Blau (Reihe 2)
    expect(typeAt(s, "A2")).toBe("LIGHT_CAV");
    expect(typeAt(s, "J2")).toBe("LIGHT_CAV");
    expect(typeAt(s, "B2")).toBeNull();
    expect(typeAt(s, "I2")).toBeNull();
    // innere Läufer bleiben (E/F der Kavalleriereihe)
    expect(typeAt(s, "E10")).toBe("LIGHT_CAV");
    expect(typeAt(s, "F10")).toBe("LIGHT_CAV");
  });

  it("Grundlinie und Festungsfelder unverändert", () => {
    expect(typeAt(s, "E11")).toBe("GENERAL");
    expect(ownerAt(s, "E11")).toBe("RED");
    expect(typeAt(s, "F11")).toBe("QUEEN");
    expect(typeAt(s, "E1")).toBe("GENERAL");
    expect(ownerAt(s, "E1")).toBe("BLUE");
  });

  it("Läufer auf A/J haben ab Zug 1 mindestens einen legalen Marsch", () => {
    const blue = createInitialState(); // Blau am Zug
    for (const sq of ["A2", "J2"]) {
      const u = unitAt(blue, fromAlgebraic(sq))!;
      const marches = getLegalActions(blue, u.id).filter((a) => a.type === "MARCH");
      expect(marches.length).toBeGreaterThan(0);
    }
    const red: GameState = { ...createInitialState(), currentPlayer: "RED" };
    for (const sq of ["A10", "J10"]) {
      const u = unitAt(red, fromAlgebraic(sq))!;
      const marches = getLegalActions(red, u.id).filter((a) => a.type === "MARCH");
      expect(marches.length).toBeGreaterThan(0);
    }
  });
});

describe("Preset v3_classic", () => {
  const s = createInitialState(DEFAULT_RULES, "v3_classic");

  it("hat 16 Bauern pro Spieler", () => {
    expect(pawnCount(s, "RED")).toBe(16);
    expect(pawnCount(s, "BLUE")).toBe(16);
  });

  it("Läufer stehen auf B/I, Flanken A/J sind leer", () => {
    expect(typeAt(s, "B10")).toBe("LIGHT_CAV");
    expect(typeAt(s, "I10")).toBe("LIGHT_CAV");
    expect(typeAt(s, "A10")).toBeNull();
    expect(typeAt(s, "J10")).toBeNull();
    expect(toAlgebraic({ col: 0, row: 10 })).toBe("A10"); // Sanity
  });

  it("beide vorderen Reihen voll besetzt (B–I)", () => {
    for (const c of ["B", "C", "D", "E", "F", "G", "H", "I"]) {
      expect(typeAt(s, `${c}8`)).toBe("INFANTRY");
      expect(typeAt(s, `${c}4`)).toBe("INFANTRY");
    }
  });
});
