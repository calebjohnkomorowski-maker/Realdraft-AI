const money = (n) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className={`text-lg font-semibold ${accent || "text-slate-100"}`}>
        {value}
      </span>
    </div>
  );
}

export default function GlobalPnL({ pnl }) {
  if (!pnl) return null;
  const profitColor = pnl.profit >= 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="grid grid-cols-3 gap-4 rounded-xl bg-room px-5 py-3 ring-1 ring-wall sm:grid-cols-6">
      <Stat label="Revenue" value={money(pnl.revenue)} />
      <Stat label="COGS" value={money(pnl.cogs)} />
      <Stat label="Marketing" value={money(pnl.marketing)} />
      <Stat label="Profit" value={money(pnl.profit)} accent={profitColor} />
      <Stat label="Orders" value={pnl.orders.toLocaleString()} />
      <Stat label="Treasury" value={money(pnl.treasury)} accent="text-amber-300" />
    </div>
  );
}
