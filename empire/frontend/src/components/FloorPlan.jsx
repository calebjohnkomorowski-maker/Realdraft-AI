import Room from "./Room";

// The "building": storefront rooms laid out as a connected floor plan.
export default function FloorPlan({ businesses }) {
  return (
    <div className="rounded-2xl bg-panel/60 p-4 ring-1 ring-wall">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
        <span className="h-px flex-1 bg-wall" />
        Storefront Floor
        <span className="h-px flex-1 bg-wall" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {businesses?.map((b) => (
          <Room key={b.id} biz={b} />
        ))}
      </div>
    </div>
  );
}
