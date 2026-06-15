import DecisionFeed from "./DecisionFeed";

const money = (n) =>
  "$" + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function CeoPanel({ world }) {
  if (!world) return null;
  return (
    <div className="rounded-xl bg-gradient-to-b from-amber-950/30 to-room p-4 ring-1 ring-amber-700/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-panel text-2xl ring-1 ring-amber-700/50">
            👔
          </div>
          <div>
            <div className="font-semibold">CEO — Penthouse</div>
            <div className="text-[11px] text-slate-500">
              Allocating shared treasury
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Treasury
          </div>
          <div className="text-lg font-semibold text-amber-300">
            {money(world.pnl.treasury)}
          </div>
        </div>
      </div>
      <div className="mt-3 border-t border-wall/50 pt-2">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
          CEO reasoning
        </div>
        <DecisionFeed log={world.ceo_log} height="h-36" />
      </div>
    </div>
  );
}
