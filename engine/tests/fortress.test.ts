// §7 — Festung: Mehrheit, Zähler-Reset, Sieg, Heilung
import { describe, expect, it } from "vitest";
import { endTurn } from "../actions";
import { hasFortressMajority } from "../victory";
import { build } from "./helpers";

describe("Festungs-Mehrheit (§7 [ANNAHME])", () => {
  it("mehr eigene als gegnerische Einheiten auf E/F = Mehrheit", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E11" }], {
      current: "BLUE",
    });
    expect(hasFortressMajority(s, "BLUE")).toBe(true);
  });

  it("Gleichstand ist keine Mehrheit (strikt)", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E11" },
      { id: "r", type: "INFANTRY", owner: "RED", at: "F11" },
    ]);
    expect(hasFortressMajority(s, "BLUE")).toBe(false);
  });

  it("erhöht den Zähler am Zugende bei Mehrheit", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E11" }], {
      current: "BLUE",
    });
    const s2 = endTurn(s);
    expect(s2.fortressCounters.BLUE).toBe(1);
  });

  it("Zähler resettet, sobald die Mehrheit verloren geht (§7)", () => {
    const s = build([{ id: "r", type: "INFANTRY", owner: "RED", at: "E11" }], {
      current: "BLUE",
      fortressCounters: { RED: 0, BLUE: 2 },
    });
    // Blau hält keine Mehrheit mehr (Rot steht auf E11).
    const s2 = endTurn(s);
    expect(s2.fortressCounters.BLUE).toBe(0);
  });

  it("Mehrheit über 3 aufeinanderfolgende Zugenden = Sieg (§7)", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E11" }], {
      current: "BLUE",
      fortressCounters: { RED: 0, BLUE: 2 },
    });
    const s2 = endTurn(s);
    expect(s2.fortressCounters.BLUE).toBe(3);
    expect(s2.winner).toEqual({ winner: "BLUE", type: "FORTRESS" });
  });
});

describe("Festungs-Heilung (§7)", () => {
  it("heilt +2 zu Beginn des eigenen Zuges auf gegnerischem Festungsfeld", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E11", hp: 7 }], {
      current: "RED", // Rot beendet -> Blau am Zug, Heilung
    });
    const s2 = endTurn(s);
    expect(s2.currentPlayer).toBe("BLUE");
    expect(s2.units["b"].hp).toBe(9);
  });

  it("Heilung ist bei 10 HP gedeckelt (§7)", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E11", hp: 9 }], {
      current: "RED",
    });
    const s2 = endTurn(s);
    expect(s2.units["b"].hp).toBe(10); // nicht 11
  });

  it("heilt nicht auf eigenem Festungsfeld", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E1", hp: 7 }], {
      current: "RED",
    });
    const s2 = endTurn(s);
    expect(s2.units["b"].hp).toBe(7); // E1 ist Blaus eigene Festung
  });
});
