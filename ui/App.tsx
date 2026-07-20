import { useMemo, useState } from "react";
import {
  applyAction,
  COLS,
  createInitialState,
  fortressCounts,
  getLegalActions,
  isFortress,
  posKey,
  ROWS,
  toAlgebraic,
  unitAt,
  type CostedAction,
  type GameState,
  type Position,
} from "../engine";
import { ACTION_LABEL, UNIT_META } from "./units";

const LETTERS = "ABCDEFGHIJ";

function isAttack(t: CostedAction["type"]): boolean {
  return t === "PUSH" || t === "MARCH_ATTACK" || t === "SHOOT" || t === "SHOOT_RIDE";
}

export function App() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [selected, setSelected] = useState<string | null>(null);
  const [chooser, setChooser] = useState<{ pos: Position; actions: CostedAction[] } | null>(
    null,
  );

  const legalForSelected = useMemo<CostedAction[]>(
    () => (selected ? getLegalActions(state, selected) : []),
    [state, selected],
  );

  // Zielfeld-Schlüssel -> mögliche Aktionen (mehrere z.B. Stoß vs. Marschangriff).
  const legalMap = useMemo(() => {
    const m = new Map<string, CostedAction[]>();
    for (const a of legalForSelected) {
      const p = "to" in a ? a.to : a.target;
      const k = posKey(p);
      const arr = m.get(k);
      if (arr) arr.push(a);
      else m.set(k, [a]);
    }
    return m;
  }, [legalForSelected]);

  // Einheiten des aktuellen Spielers, die überhaupt eine Aktion haben.
  const actionableUnits = useMemo(() => {
    const set = new Set<string>();
    if (state.winner) return set;
    for (const u of Object.values(state.units)) {
      if (u.owner === state.currentPlayer && getLegalActions(state, u.id).length > 0) {
        set.add(u.id);
      }
    }
    return set;
  }, [state]);

  function apply(action: CostedAction) {
    const next = applyAction(state, action);
    setState(next);
    setChooser(null);
    setSelected(next.pendingRide ? next.pendingRide.shooterId : null);
  }

  function onCellClick(pos: Position) {
    if (state.winner) return;
    const k = posKey(pos);

    if (selected) {
      const acts = legalMap.get(k);
      if (acts && acts.length > 0) {
        if (acts.length === 1) apply(acts[0]);
        else setChooser({ pos, actions: acts });
        return;
      }
    }

    const u = unitAt(state, pos);
    setChooser(null);
    if (u && u.owner === state.currentPlayer && actionableUnits.has(u.id)) {
      setSelected(u.id);
    } else {
      setSelected(null);
    }
  }

  function endTurn() {
    setState(applyAction(state, { type: "PASS" }));
    setSelected(null);
    setChooser(null);
  }

  function newGame() {
    setState(createInitialState());
    setSelected(null);
    setChooser(null);
  }

  const rows = [];
  for (let row = ROWS; row >= 1; row--) rows.push(row);

  const fc = fortressCounts(state, state.currentPlayer);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Das Kompakte Schlachtfeld</h1>
        <span className="subtitle">Hotseat · 2 Spieler</span>
      </header>

      <div className="layout">
        <main>
          <StatusBar state={state} />

          <div className="board-wrap">
            <div
              className="board"
              style={{ gridTemplateColumns: `28px repeat(${COLS}, 1fr)` }}
            >
              {/* Spaltenüberschrift */}
              <div className="corner" />
              {Array.from({ length: COLS }, (_, c) => (
                <div key={`h${c}`} className="axis">
                  {LETTERS[c]}
                </div>
              ))}

              {rows.map((row) => (
                <RowView
                  key={row}
                  row={row}
                  state={state}
                  selected={selected}
                  legalMap={legalMap}
                  actionable={actionableUnits}
                  onCellClick={onCellClick}
                />
              ))}
            </div>

            {chooser && (
              <ActionChooser
                chooser={chooser}
                onPick={apply}
                onCancel={() => setChooser(null)}
              />
            )}
          </div>

          <div className="controls">
            <button className="btn primary" onClick={endTurn} disabled={!!state.winner}>
              Zug beenden
            </button>
            <button className="btn" onClick={newGame}>
              Neues Spiel
            </button>
            {selected && state.units[selected] && (
              <span className="hint">
                Gewählt: {UNIT_META[state.units[selected].type].label} (
                {toAlgebraic(state.units[selected].pos)})
              </span>
            )}
            {state.pendingRide && (
              <span className="hint ride">
                Nachritt möglich auf {toAlgebraic(state.pendingRide.target)} (+
                {state.rules.rideCost} Bote) — Feld anklicken oder anders handeln.
              </span>
            )}
          </div>
        </main>

        <aside className="sidebar">
          <FortressPanel state={state} fc={fc} />
          <Legend />
          <LogPanel state={state} />
        </aside>
      </div>

      {state.winner && <VictoryOverlay state={state} onNewGame={newGame} />}
    </div>
  );
}

function StatusBar({ state }: { state: GameState }) {
  const p = state.currentPlayer;
  return (
    <div className={`statusbar ${p.toLowerCase()}`}>
      <div className="turn">
        <span className={`dot ${p.toLowerCase()}`} />
        Am Zug: <strong>{p === "RED" ? "Rot" : "Blau"}</strong>
        <span className="muted"> · Runde {state.turnNumber}</span>
      </div>
      <div className="boten">
        Boten:{" "}
        <span className="pips">
          {Array.from({ length: state.rules.messengersPerTurn }, (_, i) => (
            <span key={i} className={`pip ${i < state.messengers ? "on" : "off"}`} />
          ))}
        </span>
        <strong>{state.messengers}</strong>/{state.rules.messengersPerTurn}
      </div>
    </div>
  );
}

function RowView({
  row,
  state,
  selected,
  legalMap,
  actionable,
  onCellClick,
}: {
  row: number;
  state: GameState;
  selected: string | null;
  legalMap: Map<string, CostedAction[]>;
  actionable: Set<string>;
  onCellClick: (p: Position) => void;
}) {
  const cells = [];
  for (let col = 0; col < COLS; col++) {
    const pos = { col, row };
    const k = posKey(pos);
    const unit = unitAt(state, pos);
    const acts = legalMap.get(k);
    const isSel = unit && unit.id === selected;
    const dark = (col + row) % 2 === 0;
    const fortRed = isFortress(pos, "RED");
    const fortBlue = isFortress(pos, "BLUE");

    let mark = "";
    if (acts && acts.length) mark = acts.some((a) => isAttack(a.type)) ? "attack" : "move";

    const classes = [
      "cell",
      dark ? "dark" : "light",
      fortRed ? "fort-red" : "",
      fortBlue ? "fort-blue" : "",
      isSel ? "selected" : "",
      mark,
      unit && unit.owner === state.currentPlayer && actionable.has(unit.id)
        ? "actionable"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    cells.push(
      <button
        key={k}
        className={classes}
        onClick={() => onCellClick(pos)}
        title={toAlgebraic(pos)}
      >
        {unit && <UnitChip unit={unit} />}
        {mark && !unit && <span className={`marker ${mark}`} />}
      </button>,
    );
  }
  return (
    <>
      <div className="axis">{row}</div>
      {cells}
    </>
  );
}

function UnitChip({ unit }: { unit: GameState["units"][string] }) {
  const meta = UNIT_META[unit.type];
  const pct = Math.max(0, Math.min(100, (unit.hp / 10) * 100));
  return (
    <span className={`unit ${unit.owner.toLowerCase()}`}>
      <span className="glyph" aria-hidden>
        {meta.glyph}
      </span>
      <span className="sym">{meta.symbol}</span>
      <span className="hpbar">
        <span className="hpfill" style={{ width: `${pct}%` }} />
      </span>
      <span className="hpnum">{unit.hp}</span>
    </span>
  );
}

function ActionChooser({
  chooser,
  onPick,
  onCancel,
}: {
  chooser: { pos: Position; actions: CostedAction[] };
  onPick: (a: CostedAction) => void;
  onCancel: () => void;
}) {
  return (
    <div className="chooser-backdrop" onClick={onCancel}>
      <div className="chooser" onClick={(e) => e.stopPropagation()}>
        <h4>Aktion auf {toAlgebraic(chooser.pos)}</h4>
        {chooser.actions.map((a, i) => (
          <button key={i} className="btn" onClick={() => onPick(a)}>
            {ACTION_LABEL[a.type]} · {a.cost} Bote{a.cost > 1 ? "n" : ""}
          </button>
        ))}
        <button className="btn ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function FortressPanel({
  state,
  fc,
}: {
  state: GameState;
  fc: { own: number; enemy: number };
}) {
  return (
    <section className="panel">
      <h3>Festung (§7)</h3>
      <div className="fort-counters">
        <div>
          <span className="dot blue" /> Blau: {state.fortressCounters.BLUE}/
          {state.rules.fortressHoldTurnsToWin}
        </div>
        <div>
          <span className="dot red" /> Rot: {state.fortressCounters.RED}/
          {state.rules.fortressHoldTurnsToWin}
        </div>
      </div>
      <p className="muted small">
        {state.currentPlayer === "RED" ? "Rot" : "Blau"} auf gegnerischer Festung:{" "}
        {fc.own} eigene / {fc.enemy} gegn.
      </p>
    </section>
  );
}

function Legend() {
  return (
    <section className="panel">
      <h3>Einheiten</h3>
      <ul className="legend">
        {(
          Object.entries(UNIT_META) as [keyof typeof UNIT_META, (typeof UNIT_META)[keyof typeof UNIT_META]][]
        ).map(([k, m]) => (
          <li key={k}>
            <span className="glyph">{m.glyph}</span> <strong>{m.symbol}</strong> {m.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LogPanel({ state }: { state: GameState }) {
  const entries = [...state.log].slice(-40).reverse();
  return (
    <section className="panel log">
      <h3>Zug-Log</h3>
      <ul>
        {entries.length === 0 && <li className="muted">Noch keine Aktionen.</li>}
        {entries.map((e, i) => (
          <li key={i}>
            <span className={`tag ${e.player.toLowerCase()}`}>R{e.turn}</span> {e.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function VictoryOverlay({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  const w = state.winner!;
  const name = w.winner === "RED" ? "Rot" : "Blau";
  const how = w.type === "GENERAL_KILL" ? "Generalsmord" : "Festung gehalten";
  return (
    <div className="victory-backdrop">
      <div className={`victory ${w.winner.toLowerCase()}`}>
        <h2>{name} gewinnt!</h2>
        <p>{how}</p>
        <button className="btn primary" onClick={onNewGame}>
          Neues Spiel
        </button>
      </div>
    </div>
  );
}
