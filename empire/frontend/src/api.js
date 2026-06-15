// REST helpers. The WebSocket lives in store.js.

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
  return res.json();
}

export const api = {
  setSpeed: (speed) => post("/api/control/speed", { speed }),
  instruct: (target, instruction) =>
    post("/api/founder/instruct", { target, instruction }),
  getState: () => fetch("/api/state").then((r) => r.json()),
};
