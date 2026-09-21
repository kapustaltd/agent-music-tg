import { useEffect, useState } from "react";

export const DOCK_REVEAL_TOP = 24;
const DOCK_HIDE_DISTANCE = 16;

function readScrollY(): number {
  return Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
}

/**
 * Hides the mobile dock once the user is intentionally reading down the page.
 * The dock only returns at the top, so a small upward correction does not make
 * the navigation flicker while the user is still in the content.
 */
export function useDockVisibility(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let previousY = readScrollY();
    let downwardDistance = 0;
    let frame: number | null = null;

    function update() {
      frame = null;
      const currentY = readScrollY();
      const delta = currentY - previousY;
      previousY = currentY;

      if (currentY <= DOCK_REVEAL_TOP) {
        downwardDistance = 0;
        setVisible(true);
        return;
      }

      if (delta > 0) {
        downwardDistance += delta;
        if (downwardDistance >= DOCK_HIDE_DISTANCE) setVisible(false);
      } else if (delta < 0) {
        downwardDistance = 0;
      }
    }

    function onScroll() {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return visible;
}
