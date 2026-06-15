import { create } from "zustand";

// Live dashboard state, fed by the WebSocket snapshot stream.
export const useStore = create((set, get) => ({
  connected: false,
  mode: "mock",
  clock: { speed: "1x" },
  world: null,
  selected: null, // business id for the founder panel target

  setSelected: (id) => set({ selected: id }),

  connect: () => {
    if (get()._ws) return;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => set({ connected: true });
    ws.onclose = () => {
      set({ connected: false, _ws: null });
      // Auto-reconnect after a short delay.
      setTimeout(() => get().connect(), 1500);
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "snapshot") {
        set({ world: msg.world, mode: msg.mode, clock: msg.clock });
      }
    };
    set({ _ws: ws });
  },
  _ws: null,
}));
