// A page kept mounted comes back at its full height, but one mounted fresh
// may still be loading, so the scroll is re-applied as the page grows until
// it fits, the viewer scrolls, or a second and a half passes.
export function restoreScroll(y: number): () => void {
  // A block body: Chromium's scrollTo returns a promise.
  const apply = () => {
    window.scrollTo(0, y);
  };
  apply();
  const fits = () => document.documentElement.scrollHeight - window.innerHeight >= y;
  if (y === 0 || fits()) return () => {};
  const grow = new ResizeObserver(() => {
    apply();
    if (fits()) stop();
  });
  const timer = setTimeout(() => stop(), 1500);
  function stop() {
    grow.disconnect();
    clearTimeout(timer);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
  }
  grow.observe(document.body);
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  return stop;
}

// The shells restore scroll themselves; the browser's own restore would jump
// the page first, before the restored page has rendered.
export function manualScrollRestoration() {
  const was = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  return () => {
    window.history.scrollRestoration = was;
  };
}
