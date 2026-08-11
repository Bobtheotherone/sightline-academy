import { useEffect, useState } from "react";

/**
 * Entry flip for Radix overlays (DESIGN-004: nothing appears instantly).
 * Portal content mounts already in its open state, so a CSS transition has no
 * first frame to run from — track the open flag and flip one tick later. The
 * global reduced-motion rule still collapses the transition to nothing.
 */
export function useOpenEnter(open: boolean): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const t = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(t);
  }, [open]);
  return entered;
}
