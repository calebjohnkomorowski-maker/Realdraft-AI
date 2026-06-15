import DecisionFeed from "./DecisionFeed";
import { useStore } from "../store";

const money = (n) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

const PRIORITY_RING = {
  high: "ring-emerald-500/70",
  normal: "ring-wall",
  low: "ring-rose-500/40",
};

function Metric({ label, value, color }) {
  return (
    <div className="rounded bg-panel/60 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`text-sm font-semibold ${color || "text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}

export default function Room({ biz }) {
  const setSelected = useStore((s) => s.setSelected);
  const selected = useStore((s) => s.selected);
  const m = biz.metrics;
  const paused = biz.status === "paused";
  const isSel = selected === biz.id;

  return (
    <div
      onClick={() => setSelected(biz.id)}
      className={`cursor-pointer rounded-xl bg-room p-4 ring-1 transition hover:ring-2 ${
        isSel ? "ring-2 ring-sky-400" : PRIORITY_RING[biz.priority] || "ring-wall"
      } ${paused ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-panel text-2xl ring-1 ring-wall">
            {biz.avatar}
          </div>
          <div>
            <div className="font-semibold leading-tight">{biz.name}</div>
            <div className="text-[11px] text-slate-500">Room {biz.room}</div>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
            paused
              ? "bg-rose-900/50 text-rose-300"
              : "bg-emerald-900/40 text-emerald-300"
          }`}
        >
          {biz.status}
        </span>
      </div>

      <div
        className={`mt-3 flex items-center gap-2 text-xs ${
          paused ? "text-slate-500" : "text-sky-300"
        }`}
      >
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full bg-sky-400 ${
            paused ? "" : "animate-pulseGlow"
          }`}
        />
        {biz.current_action}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric
          label="Profit"
          value={money(m.total_profit)}
          color={m.total_profit >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <Metric label="Revenue" value={money(m.total_revenue)} />
        <Metric label="Orders" value={m.total_orders} />
        <Metric label="Cash" value={money(biz.cash)} color="text-amber-300" />
        <Metric
          label="Last Δ"
          value={money(m.last_profit)}
          color={m.last_profit >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <Metric label="Rep" value={`${Math.round(biz.reputation * 100)}%`} />
      </div>

      {biz.directives?.length > 0 && (
        <div className="mt-2 rounded bg-sky-950/40 px-2 py-1 text-[11px] text-sky-300">
          ▸ {biz.directives[biz.directives.length - 1]}
        </div>
      )}

      <div className="mt-3 border-t border-wall/50 pt-2">
        <DecisionFeed log={biz.log} height="h-32" />
      </div>
    </div>
  );
}
