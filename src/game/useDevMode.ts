import { useCallback, useRef, useState } from "react";

const DEV_MODE_KEY = "rider-dev-mode";
const TAP_THRESHOLD = 7;
const TAP_WINDOW_MS = 2000;

/**
 * Hidden dev-tools toggle: tap the header logo 7 times within 2 seconds to
 * flip it on/off. Stored under its own localStorage key, separate from the
 * save (SAVE_KEY) — so it survives a hard reset and never touches save
 * schema/versioning. Not gated behind import.meta.env.DEV since this game
 * is tested by loading the live deployed build on a phone, not just via
 * `npm run dev`.
 */
export function useDevMode() {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DEV_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const tapCount = useRef(0);
  const tapTimer = useRef<number | null>(null);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      localStorage.setItem(DEV_MODE_KEY, next ? "1" : "0");
    } catch {
      // storage unavailable — the toggle just won't persist across reloads
    }
  }, []);

  const registerLogoTap = useCallback(() => {
    tapCount.current += 1;
    if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => {
      tapCount.current = 0;
    }, TAP_WINDOW_MS);
    if (tapCount.current >= TAP_THRESHOLD) {
      tapCount.current = 0;
      setEnabledState((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(DEV_MODE_KEY, next ? "1" : "0");
        } catch {
          // storage unavailable — the toggle just won't persist across reloads
        }
        return next;
      });
    }
  }, []);

  return { enabled, setEnabled, registerLogoTap };
}
