import { useEffect, useState } from "react";

/** One minimum display period per app mount, while auth readiness stays authoritative. */
export function useStartupPending(loading: boolean) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), 3_000);
    return () => window.clearTimeout(timer);
  }, []);
  return loading || !minimumElapsed;
}
