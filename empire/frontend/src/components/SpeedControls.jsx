import { api } from "../api";
import { useStore } from "../store";

const SPEEDS = [
  { key: "pause", label: "⏸ Pause" },
  { key: "1x", label: "▶ 1x" },
  { key: "fast", label: "⏩ Fast" },
];

export default function SpeedControls() {
  const speed = useStore((s) => s.clock?.speed);
  return (
    <div className="flex gap-1 rounded-lg bg-panel p-1 ring-1 ring-wall">
      {SPEEDS.map((s) => (
        <button
          key={s.key}
          onClick={() => api.setSpeed(s.key)}
          className={`rounded px-3 py-1 text-sm font-medium transition ${
            speed === s.key
              ? "bg-emerald-600 text-white"
              : "text-slate-300 hover:bg-wall"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
