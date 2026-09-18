import type { ReactNode } from "react";

/**
 * Keeps screen changes local to the content stack. The previous screen is
 * unmounted immediately so it cannot flash, double-render, or leave a stale
 * decorative layer behind during navigation.
 */
export function ScreenTransition({
  kind,
  children,
}: {
  kind: string;
  children: ReactNode;
}) {
  return (
    <div className="screen-stack">
      <div className="screen-enter" key={kind}>
        {children}
      </div>
    </div>
  );
}
