"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Manda un latido a /api/presence al cargar, al cambiar de página y cada 45 s.
 * Es invisible para el usuario y no bloquea nada.
 */
export function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    function ping() {
      if (document.visibilityState === "hidden") return;
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    }

    ping();
    const interval = window.setInterval(ping, 45_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
