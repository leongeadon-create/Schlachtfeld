// ui/units.ts — Anzeige-Metadaten für Einheitentypen.
import type { UnitType } from "../engine";

export const UNIT_META: Record<
  UnitType,
  { symbol: string; label: string; glyph: string }
> = {
  INFANTRY: { symbol: "B", label: "Infanterie", glyph: "♟" },
  ARCHER: { symbol: "S", label: "Ber. Bogenschütze", glyph: "♘" },
  LIGHT_CAV: { symbol: "L", label: "Leichte Kavallerie", glyph: "♝" },
  HEAVY_CAV: { symbol: "T", label: "Schwere Kavallerie", glyph: "♜" },
  QUEEN: { symbol: "D", label: "Dame", glyph: "♛" },
  GENERAL: { symbol: "K", label: "General / HQ", glyph: "♚" },
};

export const ACTION_LABEL: Record<string, string> = {
  STEP: "Schritt",
  PUSH: "Stoß",
  MARCH: "Marsch",
  MARCH_ATTACK: "Marschangriff",
  SHOOT: "Schuss",
  SHOOT_RIDE: "Nachritt",
  LINE_COMMAND: "Linienbefehl",
};
