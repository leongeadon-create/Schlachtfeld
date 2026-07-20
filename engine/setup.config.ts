// engine/setup.config.ts
// Startaufstellungen als Presets (damit Varianten testbar sind).
//
// Brett V6: 10 Spalten (A..J) × 12 Reihen. Blau 1–4, Rot 9–12, Niemandsland 5–8.
// Jede Reihe ist genau 10 Zeichen (Spalten A..J), '.' = leer.
// Symbole: B Infanterie · S Armbrustschütze · L Läufer · T Turm · D Dame · K König.

import type { Player } from "./types";

export interface SetupRow {
  row: number;
  owner: Player;
  cells: string; // 10 Zeichen, A..J
}

// V6 (klassisch adaptiert): König E, Dame F auf der Festungsreihe (D–G).
export const SETUP_V6: SetupRow[] = [
  { row: 12, owner: "RED", cells: ".TT.KD.TT." },
  { row: 11, owner: "RED", cells: ".LSSLLSSL." },
  { row: 10, owner: "RED", cells: ".BBBBBBBB." },
  { row: 9, owner: "RED", cells: ".BBBBBBBB." },
  { row: 4, owner: "BLUE", cells: ".BBBBBBBB." },
  { row: 3, owner: "BLUE", cells: ".BBBBBBBB." },
  { row: 2, owner: "BLUE", cells: ".LSSLLSSL." },
  { row: 1, owner: "BLUE", cells: ".TT.KD.TT." },
];

export type SetupName = "v6";

export const SETUP_PRESETS: Record<SetupName, SetupRow[]> = {
  v6: SETUP_V6,
};

export const DEFAULT_SETUP: SetupName = "v6";
