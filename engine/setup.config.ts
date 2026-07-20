// engine/setup.config.ts
// Startaufstellungen als Presets (ÄNDERUNG B, V4) — damit Varianten testbar sind.
//
// Reihennummerierung bezieht sich auf das aktuelle 11-Reihen-Brett (V3):
//   Rot: Grundlinie 11, Kavallerie 10, Bauern 9 (hinten) & 8 (vorn).
//   Blau: gespiegelt auf 1 / 2 / 3 / 4.
// Jede Reihe ist genau 10 Zeichen breit (Spalten A..J), '.' = leer.
// Symbole: B Infanterie · S Ber. Bogenschütze · L Läufer · T Turm · D Dame · K General.

import type { Player } from "./types";

export interface SetupRow {
  row: number;
  owner: Player;
  cells: string; // 10 Zeichen, A..J
}

// V4: 12 Bauern/Spieler (hintere Reihe 8, vordere Reihe 4 Stück auf C/E/F/H),
// äußere Läufer auf den Flanken A/J.
export const SETUP_V4: SetupRow[] = [
  { row: 11, owner: "RED", cells: ".TT.KD.TT." },
  { row: 10, owner: "RED", cells: "L.SSLLSS.L" },
  { row: 9, owner: "RED", cells: ".BBBBBBBB." },
  { row: 8, owner: "RED", cells: "..B.BB.B.." },
  { row: 4, owner: "BLUE", cells: "..B.BB.B.." },
  { row: 3, owner: "BLUE", cells: ".BBBBBBBB." },
  { row: 2, owner: "BLUE", cells: "L.SSLLSS.L" },
  { row: 1, owner: "BLUE", cells: ".TT.KD.TT." },
];

// V3-Klassiker: 16 Bauern/Spieler, Läufer auf B/I (die Aufstellung vor V4).
export const SETUP_V3_CLASSIC: SetupRow[] = [
  { row: 11, owner: "RED", cells: ".TT.KD.TT." },
  { row: 10, owner: "RED", cells: ".LSSLLSSL." },
  { row: 9, owner: "RED", cells: ".BBBBBBBB." },
  { row: 8, owner: "RED", cells: ".BBBBBBBB." },
  { row: 4, owner: "BLUE", cells: ".BBBBBBBB." },
  { row: 3, owner: "BLUE", cells: ".BBBBBBBB." },
  { row: 2, owner: "BLUE", cells: ".LSSLLSSL." },
  { row: 1, owner: "BLUE", cells: ".TT.KD.TT." },
];

export type SetupName = "v4" | "v3_classic";

export const SETUP_PRESETS: Record<SetupName, SetupRow[]> = {
  v4: SETUP_V4,
  v3_classic: SETUP_V3_CLASSIC,
};

export const DEFAULT_SETUP: SetupName = "v4";
