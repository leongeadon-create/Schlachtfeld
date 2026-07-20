// V6 — Bewegung: Schritt, Kavallerie-Schritt, Marsch, Läufer-Blockade, Bauern
import { describe, expect, it } from "vitest";
import { applyAction, getLegalActions } from "../actions";
import { fromAlgebraic } from "../board";
import { build, findAction } from "./helpers";

const has = (s: ReturnType<typeof build>, id: string, type: string, sq: string) =>
  !!findAction(getLegalActions(s, id), type, sq);

describe("Schritt & Kavallerie-Schritt (§4)", () => {
  it("Schritt: 1 Feld jede Richtung auf leeres Feld", () => {
    const s = build([{ id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" }]);
    for (const sq of ["E5", "E3", "D4", "F4", "D5", "F5"]) expect(has(s, "t", "STEP", sq)).toBe(true);
  });

  it("Kavallerie-Schritt: 2 Felder gerade, Zwischenfeld frei (L/T/S)", () => {
    const s = build([{ id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" }]);
    expect(has(s, "t", "STEP", "E6")).toBe(true); // 2 gerade
    expect(has(s, "t", "STEP", "G4")).toBe(true);
    const blocked = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "x", type: "INFANTRY", owner: "BLUE", at: "E5" }, // Zwischenfeld belegt
    ]);
    expect(has(blocked, "t", "STEP", "E6")).toBe(false);
  });

  it("Kavallerie-Schritt-Angriff über 2 Felder: Angreifer rückt aufs Zwischenfeld", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "e", type: "QUEEN", owner: "RED", at: "E6", hp: 10 },
    ]);
    const a = findAction(getLegalActions(s, "t"), "STEP_ATTACK", "E6")!;
    const s2 = applyAction(s, a);
    expect(s2.units["e"].hp).toBe(8); // Turm-Basis 2
    expect(s2.units["t"].pos).toEqual(fromAlgebraic("E5")); // Zwischenfeld
  });
});

describe("Läufer-Blockade (§5, Bugfix)", () => {
  it("blockiert durch eigene Figur, teleportiert nicht", () => {
    const s = build([
      { id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" },
      { id: "own", type: "INFANTRY", owner: "BLUE", at: "G6" },
    ]);
    expect(has(s, "l", "MARCH", "F5")).toBe(true);
    expect(has(s, "l", "MARCH", "G6")).toBe(false); // eigenes Feld
    expect(has(s, "l", "MARCH", "H7")).toBe(false); // NICHT dahinter (kein Teleport)
  });

  it("greift erste gegnerische Figur an, nicht dahinter", () => {
    const s = build([
      { id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" },
      { id: "foe", type: "INFANTRY", owner: "RED", at: "G6" },
    ]);
    expect(has(s, "l", "MARCH", "F5")).toBe(true);
    expect(has(s, "l", "MARCH_ATTACK", "G6")).toBe(true);
    expect(has(s, "l", "MARCH", "H7")).toBe(false);
    expect(has(s, "l", "MARCH_ATTACK", "H7")).toBe(false);
  });

  it("Farbwechsel per orthogonalem Schritt", () => {
    const s = build([{ id: "l", type: "LIGHT_CAV", owner: "BLUE", at: "E4" }]);
    // orthogonaler 1-Feld-Schritt wechselt die Feldfarbe
    expect(has(s, "l", "STEP", "E5")).toBe(true);
    expect(has(s, "l", "STEP", "D4")).toBe(true);
  });
});

describe("Bauern-Bewegung (V6)", () => {
  it("Rückwärts-Zug auf leeres Feld erlaubt", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E5" }]);
    expect(has(s, "b", "STEP", "E4")).toBe(true); // rückwärts, leer
  });

  it("aber kein Rückwärts-Angriff", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E5" },
      { id: "e", type: "INFANTRY", owner: "RED", at: "E4" }, // hinter dem Bauern
      { id: "e2", type: "INFANTRY", owner: "RED", at: "D4" }, // diagonal hinten
    ]);
    expect(has(s, "b", "STEP_ATTACK", "E4")).toBe(false);
    expect(has(s, "b", "STEP_ATTACK", "D4")).toBe(false);
  });

  it("Doppelschritt als erste Bewegung", () => {
    const fresh = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E3" }]);
    expect(has(fresh, "b", "STEP", "E5")).toBe(true);
    const moved = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E3", hasMoved: true }]);
    expect(has(moved, "b", "STEP", "E5")).toBe(false);
  });
});

describe("Marsch (§4)", () => {
  it("Turm marschiert gerade, blockiert wie im Schach", () => {
    const s = build([
      { id: "t", type: "HEAVY_CAV", owner: "BLUE", at: "E4" },
      { id: "own", type: "INFANTRY", owner: "BLUE", at: "E8" },
    ]);
    expect(has(s, "t", "MARCH", "E7")).toBe(true);
    expect(has(s, "t", "MARCH", "E8")).toBe(false);
    expect(has(s, "t", "MARCH", "E9")).toBe(false);
  });

  it("Dame kombiniert gerade + diagonal", () => {
    const s = build([{ id: "d", type: "QUEEN", owner: "BLUE", at: "E6" }]);
    expect(has(s, "d", "MARCH", "E12")).toBe(true);
    expect(has(s, "d", "MARCH", "A2")).toBe(true);
  });
});
