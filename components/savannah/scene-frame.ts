/** Shared presentation frame scheduler: no business state and no per-agent timers. */
type Subscriber = (now: number, dt: number) => void;
const listeners = new Set<Subscriber>();
let frame = 0,
  last = 0;
function tick(now: number) {
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
  last = now;
  for (const callback of listeners) callback(now, document.hidden ? 0 : dt);
  frame = listeners.size ? requestAnimationFrame(tick) : 0;
}
export function subscribeSceneFrame(callback: Subscriber) {
  listeners.add(callback);
  if (!frame) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(callback);
    if (!listeners.size) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
  };
}
