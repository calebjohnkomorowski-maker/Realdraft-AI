// Scrolling chain-of-thought feed for one agent.
const KIND_STYLE = {
  decision: "text-slate-300",
  directive: "text-sky-300",
  founder: "text-amber-300",
  system: "text-slate-500 italic",
};

function actionSummary(actions) {
  if (!actions?.length) return null;
  return actions
    .map((a) => {
      switch (a.type) {
        case "set_price":
          return `price → $${a.new_price}`;
        case "launch_product":
          return `launch ${a.name} @ $${a.price}`;
        case "discontinue_product":
          return "discontinue product";
        case "set_marketing_spend":
          return `marketing $${a.amount}/${a.channel}`;
        case "reply_to_review":
          return "reply to review";
        case "hold":
          return "hold";
        default:
          return a.type;
      }
    })
    .join(" · ");
}

export default function DecisionFeed({ log, height = "h-40" }) {
  const entries = [...(log || [])].reverse();
  return (
    <div className={`feed ${height} overflow-y-auto pr-1`}>
      {entries.length === 0 && (
        <div className="text-xs text-slate-600">No activity yet…</div>
      )}
      {entries.map((e, i) => (
        <div key={i} className="border-b border-wall/40 py-1.5 last:border-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-xs ${KIND_STYLE[e.kind] || "text-slate-300"}`}>
              {e.reasoning}
            </span>
            <span className="shrink-0 text-[10px] text-slate-600">t{e.tick}</span>
          </div>
          {actionSummary(e.actions) && (
            <div className="mt-0.5 text-[11px] font-mono text-emerald-400/80">
              {actionSummary(e.actions)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
