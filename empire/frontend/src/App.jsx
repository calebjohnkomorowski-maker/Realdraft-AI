import { useEffect } from "react";
import { useStore } from "./store";
import GlobalPnL from "./components/GlobalPnL";
import SpeedControls from "./components/SpeedControls";
import FloorPlan from "./components/FloorPlan";
import CeoPanel from "./components/CeoPanel";
import FounderPanel from "./components/FounderPanel";

export default function App() {
  const connect = useStore((s) => s.connect);
  const connected = useStore((s) => s.connected);
  const mode = useStore((s) => s.mode);
  const world = useStore((s) => s.world);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-wall bg-panel/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <h1 className="text-lg font-bold tracking-tight">
              AI Business Empire
            </h1>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
              mode === "live"
                ? "bg-emerald-900/50 text-emerald-300"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {mode} engine
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                connected ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            {connected ? "live" : "reconnecting…"}
          </div>
          {world && (
            <div className="text-xs text-slate-400">
              Tick <span className="font-mono text-slate-200">{world.tick}</span>{" "}
              · <span className="text-sky-300">{world.season_label}</span>
            </div>
          )}
          <div className="ml-auto">
            <SpeedControls />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-5">
        {!world ? (
          <div className="grid h-64 place-items-center text-slate-500">
            Connecting to the control room…
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <GlobalPnL pnl={world.pnl} />
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <FloorPlan businesses={world.businesses} />
              <div className="flex flex-col gap-5">
                <CeoPanel world={world} />
                <FounderPanel world={world} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
