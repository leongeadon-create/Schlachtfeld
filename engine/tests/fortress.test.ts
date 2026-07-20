// V6 — Festung D–G (§7)
import { describe, expect, it } from "vitest";
import { endTurn } from "../actions";
import { hasFortressMajority } from "../victory";
import { build } from "./helpers";

describe("Festungs-Mehrheit auf D–G (§7)", () => {
  it("eigene Einheit auf gegnerischer Festung = Mehrheit", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E12" }], { current: "BLUE" });
    expect(hasFortressMajority(s, "BLUE")).toBe(true);
  });

  it("zählt alle vier Felder D/E/F/G", () => {
    const s = build([
      { id: "b1", type: "INFANTRY", owner: "BLUE", at: "D12" },
      { id: "b2", type: "INFANTRY", owner: "BLUE", at: "E12" },
      { id: "r1", type: "INFANTRY", owner: "RED", at: "F12" },
    ]);
    expect(hasFortressMajority(s, "BLUE")).toBe(true); // 2 vs 1
  });

  it("Gleichstand ist keine Mehrheit", () => {
    const s = build([
      { id: "b", type: "INFANTRY", owner: "BLUE", at: "E12" },
      { id: "r", type: "INFANTRY", owner: "RED", at: "F12" },
    ]);
    expect(hasFortressMajority(s, "BLUE")).toBe(false);
  });

  it("Sieg über 3 aufeinanderfolgende Zugenden", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E12" }], {
      current: "BLUE",
      fortressCounters: { RED: 0, BLUE: 2 },
    });
    const s2 = endTurn(s);
    expect(s2.fortressCounters.BLUE).toBe(3);
    expect(s2.winner).toEqual({ winner: "BLUE", type: "FORTRESS" });
  });

  it("Zähler resettet bei verlorener Mehrheit", () => {
    const s = build([{ id: "r", type: "INFANTRY", owner: "RED", at: "E12" }], {
      current: "BLUE",
      fortressCounters: { RED: 0, BLUE: 2 },
    });
    expect(endTurn(s).fortressCounters.BLUE).toBe(0);
  });
});

describe("Festungs-Heilung (§7)", () => {
  it("heilt +2 zu Zugbeginn auf gegnerischem Festungsfeld", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E12", hp: 7 }], {
      current: "RED",
    });
    expect(endTurn(s).units["b"].hp).toBe(9);
  });

  it("Heilung bei eigenem Maximum gedeckelt (Armbrust 6)", () => {
    const s = build([{ id: "a", type: "ARCHER", owner: "BLUE", at: "E12", hp: 5 }], {
      current: "RED",
    });
    expect(endTurn(s).units["a"].hp).toBe(6); // nicht 7
  });

  it("heilt nicht auf eigener Festung", () => {
    const s = build([{ id: "b", type: "INFANTRY", owner: "BLUE", at: "E1", hp: 7 }], {
      current: "RED",
    });
    expect(endTurn(s).units["b"].hp).toBe(7);
  });
});
