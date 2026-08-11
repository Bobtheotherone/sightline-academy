import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { api } from "../lib/api";

function Banner({ open }: { open: boolean }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 bg-pine-950 px-4 py-2 text-sm font-medium text-paper-0 transition-transform duration-(--ts-dur-base) ease-(--ts-ease-out) ${
        entered && open ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <WifiOff className="size-4 shrink-0 text-sun-400" strokeWidth={1.5} aria-hidden />
      You're offline. Sightline Safety Academy will reconnect automatically.
    </div>
  );
}

/**
 * Network-down banner (SPEC-002 §Error strategy, DESIGN-005): appears when the
 * browser goes offline, pings /api/meta/health until reachable, dismisses
 * itself automatically. Slides down on arrival and back up on reconnect at
 * `base` rather than popping (DESIGN-004).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [mounted, setMounted] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (!offline) return;
    const timer = window.setInterval(() => {
      api
        .health()
        .then(() => setOffline(false))
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [offline]);

  // Stay mounted through the exit slide, then release the row.
  useEffect(() => {
    if (offline) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 240);
    return () => window.clearTimeout(t);
  }, [offline]);

  if (!mounted) return null;

  return <Banner open={offline} />;
}
