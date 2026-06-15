import { useState } from "react";
import { api } from "../api";
import { useStore } from "../store";

export default function FounderPanel({ world }) {
  const selected = useStore((s) => s.selected);
  const setSelected = useStore((s) => s.setSelected);
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);

  const target = selected || "ceo";

  const send = async () => {
    if (!text.trim()) return;
    setStatus("sending");
    try {
      await api.instruct(target, text.trim());
      setText("");
      setStatus("sent");
      setTimeout(() => setStatus(null), 1500);
    } catch (e) {
      setStatus("error: " + e.message);
    }
  };

  const targetName =
    target === "ceo"
      ? "CEO"
      : world?.businesses.find((b) => b.id === target)?.name || target;

  return (
    <div className="rounded-xl bg-room p-4 ring-1 ring-wall">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">🎙 Founder Panel</div>
        {status && (
          <span className="text-[11px] text-slate-400">{status}</span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        <button
          onClick={() => setSelected("ceo")}
          className={`rounded px-2 py-1 text-xs ${
            target === "ceo" ? "bg-amber-600 text-white" : "bg-panel text-slate-300"
          }`}
        >
          👔 CEO
        </button>
        {world?.businesses.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b.id)}
            className={`rounded px-2 py-1 text-xs ${
              target === b.id ? "bg-sky-600 text-white" : "bg-panel text-slate-300"
            }`}
          >
            {b.avatar} {b.name}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={`Instruction for ${targetName}… (e.g. "Push a premium line for the holidays")`}
        className="w-full resize-none rounded-lg bg-panel p-2 text-sm text-slate-200 outline-none ring-1 ring-wall focus:ring-sky-500"
      />
      <button
        onClick={send}
        className="mt-2 w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
      >
        Send to {targetName}
      </button>
    </div>
  );
}
