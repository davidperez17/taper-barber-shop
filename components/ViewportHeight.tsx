"use client";

import { useEffect } from "react";

/**
 * Mide la altura real de la ventana con JS y la expone como `--app-height`.
 * iOS (sobre todo la PWA instalada en algunos iPhone) reporta mal 100dvh/100vh:
 * `window.innerHeight` sí da la altura visible correcta. Los shells usan
 * `height: var(--app-height)` para quedar exactos, con el bottom nav flush.
 */
export function ViewportHeight() {
  useEffect(() => {
    const set = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${h}px`);
    };
    set();
    window.addEventListener("resize", set);
    window.addEventListener("orientationchange", set);
    window.visualViewport?.addEventListener("resize", set);
    return () => {
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
      window.visualViewport?.removeEventListener("resize", set);
    };
  }, []);

  return null;
}
