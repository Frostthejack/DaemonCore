import { useEffect } from "react";
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

  // NOTE: Click-through hit-testing is now handled by the Rust backend.
  // The mouse tracker in lib.rs polls cursor position at 60Hz and checks
  // pet bounding boxes to toggle set_ignore_cursor_events synchronously.
  // This eliminates the chicken-and-egg problem where the frontend couldn't
  // receive mouse events when click-through was active.

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