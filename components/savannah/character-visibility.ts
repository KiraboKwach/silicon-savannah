/** One observer for every avatar; CSS pauses offscreen with no timers or frame state. */
let observer: IntersectionObserver | undefined;
export function observeCharacter(element: SVGSVGElement) {
  if (typeof IntersectionObserver === "undefined") return () => {};
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        entry.target.setAttribute("data-visible", String(entry.isIntersecting));
    },
    { rootMargin: "40px" },
  );
  observer.observe(element);
  return () => observer?.unobserve(element);
}
