// ui/units.ts — Anzeige-Metadaten für Einheitentypen (V6).
import type { UnitType } from "../engine";

export const UNIT_META: Record<
  UnitType,
  { symbol: string; label: string; glyph: string }
> = {
  INFANTRY: { symbol: "B", label: "Infanterie", glyph: "♟" },
  ARCHER: { symbol: "S", label: "Armbrustschütze", glyph: "♘" },
  LIGHT_CAV: { symbol: "L", label: "Läufer", glyph: "♝" },
  HEAVY_CAV: { symbol: "T", label: "Turm", glyph: "♜" },
  QUEEN: { symbol: "D", label: "Dame", glyph: "♛" },
  GENERAL: { symbol: "K", label: "König / HQ", glyph: "♚" },
};

export const ACTION_LABEL: Record<string, string> = {
  STEP: "Zug",
  STEP_ATTACK: "Nahangriff",
  MARCH: "Marsch",
  MARCH_ATTACK: "Marsch-Angriff",
  SHOOT: "Schuss",
  FORMATION: "Formation",
};
