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

  // Canvas alpha click-through check — uses OS-level mouse position
  // so it works regardless of click-through state
  const checkMouse = useCallback(async () => {
    if (isCheckingMouseRef.current) return;
    isCheckingMouseRef.current = true;

    try {
      // Always receive cursor events so eye tracking (mouse_position)
      // and other mouse interactions work from anywhere on screen.
      // The window is always-on-top with only the pet as interactive content,
      // so click-through is not needed.
      if (lastIgnoreState.current !== false) {
        await invoke("set_ignore_cursor_events", { ignore: false });
        lastIgnoreState.current = false;
      }
    } catch (e) {
      console.error("checkMouse error:", e);
    } finally {
      isCheckingMouseRef.current = false;
    }
  }, []);

  // Run click-through check on Tauri mouse_position events (OS-level, ~60fps)
  useEffect(() => {
    const unlisten = listen<[number, number]>("mouse_position", () => {
      checkMouse();
    });

    // Also run a polling fallback every 250ms (watchdog)
    const interval = setInterval(checkMouse, 250);

    return () => {
      unlisten.then((f) => f());
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
