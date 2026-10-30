import confetti from "canvas-confetti";

const COLORS = ["#4f7cff", "#ffd94f", "#1f9d5a", "#ff8ab5"];

// Small burst anchored to an element (or lower-center screen) — used for
// every correct answer, distinct from the big end-of-session confetti.
export function popConfetti(el?: HTMLElement | null) {
  let origin = { x: 0.5, y: 0.6 };
  if (el) {
    const r = el.getBoundingClientRect();
    origin = {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    };
  }
  confetti({
    particleCount: 45,
    spread: 60,
    startVelocity: 26,
    scalar: 0.85,
    ticks: 110,
    origin,
    colors: COLORS,
    disableForReducedMotion: true,
  });
}
