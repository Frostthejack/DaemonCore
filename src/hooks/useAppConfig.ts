import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────
export type ThemeName = "midnight" | "peach" | "cloud" | "moss";
export type PetSize = "small" | "medium" | "large";
export type PetName = "owl" | "brain" | "terminal" | "magnifying" | "paw";

// ─── App Config Store ────────────────────────────────────────
interface AppConfigState {
  showPet: boolean;
  theme: ThemeName;
  size: PetSize;
  isSoundsEnabled: boolean;
  followMouse: boolean;
  setShowPet: (show: boolean) => void;
  setTheme: (theme: ThemeName) => void;
  setSize: (size: PetSize) => void;
  setSoundsEnabled: (enabled: boolean) => void;
  setFollowMouse: (enabled: boolean) => void;
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  showPet: true,
  theme: "midnight",
  size: "medium",
  isSoundsEnabled: true,
  followMouse: true,
  setShowPet: (show) => set({ showPet: show }),
  setTheme: (theme) => set({ theme }),
  setSize: (size) => set({ size }),
  setSoundsEnabled: (enabled) => set({ isSoundsEnabled: enabled }),
  setFollowMouse: (enabled) => set({ followMouse: enabled }),
}));

// ─── Hook ────────────────────────────────────────────────────
export function useAppConfig() {
  const {
    showPet,
    theme,
    size,
    isSoundsEnabled,
    followMouse,
    setShowPet,
    setTheme,
    setSize,
    setSoundsEnabled,
    setFollowMouse,
  } = useAppConfigStore();

  const lastIgnoreState = useRef<boolean | null>(null);
  const isCheckingMouseRef = useRef(false);

  // Canvas alpha click-through check
  const checkMouse = useCallback(async () => {
    if (isCheckingMouseRef.current) return;
    isCheckingMouseRef.current = true;

    try {
      const pos = await invoke<[number, number]>("get_mouse_pos");
      const x = pos[0];
      const y = pos[1];
      const target = document.elementFromPoint(x, y) as HTMLElement | null;

      let shouldIgnore = true;

      if (!target) {
        shouldIgnore = true;
      } else if (target.closest(".pet-character")) {
        const charEl = target.closest(".pet-character") as HTMLElement;
        const svg = charEl.querySelector("svg");
        if (svg) {
          const rect = svg.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = x - cx;
            const dy = y - cy;
            const radius = Math.min(rect.width, rect.height) * 0.3;
            if (dx * dx + dy * dy <= radius * radius) {
              shouldIgnore = false;
            }
          }
        }
      }

      // Check interactive elements
      const isInteractive =
        target?.closest(".bubble") ||
        target?.closest(".session-panel") ||
        target?.closest(".context-menu") ||
        target?.closest('[role="dialog"]');

      if (isInteractive) {
        shouldIgnore = false;
      }

      if (lastIgnoreState.current !== shouldIgnore) {
        await invoke("set_ignore_cursor_events", { ignore: shouldIgnore });
        lastIgnoreState.current = shouldIgnore;
      }
    } catch (e) {
      console.error("checkMouse error:", e);
    } finally {
      isCheckingMouseRef.current = false;
    }
  }, []);

  // Run click-through check on mousemove (event-driven, not polling)
  useEffect(() => {
    const handleMouseMove = () => {
      checkMouse();
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Also run a polling fallback every 250ms (watchdog)
    const interval = setInterval(checkMouse, 250);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(interval);
    };
  }, [checkMouse]);

  // Listen for tray events
  useEffect(() => {
    const unlisten = listen<string>("tray_event", (event) => {
      const id = event.payload;
      if (id === "show_pet") setShowPet(!showPet);
      if (id === "sounds") setSoundsEnabled(!isSoundsEnabled);
      if (id === "follow_mouse") setFollowMouse(!followMouse);
      if (id === "theme:midnight") setTheme("midnight");
      if (id === "theme:peach") setTheme("peach");
      if (id === "theme:cloud") setTheme("cloud");
      if (id === "theme:moss") setTheme("moss");
      if (id === "size:small") setSize("small");
      if (id === "size:medium") setSize("medium");
      if (id === "size:large") setSize("large");
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [showPet, isSoundsEnabled, followMouse, setShowPet, setSoundsEnabled, setFollowMouse, setTheme, setSize]);

  return {
    showPet,
    theme,
    size,
    isSoundsEnabled,
    followMouse,
    setTheme,
    setSize,
  };
}
