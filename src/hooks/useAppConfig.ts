import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { usePetSystemStore } from "../store/petSystem";

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

  // Get pet positions from store for bounding-box fallback
  const pets = usePetSystemStore((s) => s.pets);

  const lastIgnoreState = useRef<boolean | null>(null);
  const isCheckingMouseRef = useRef(false);

  // Get size scale for bounding box estimation
  const getSizeScale = (petSize: PetSize): number => {
    switch (petSize) {
      case "small": return 0.7;
      case "large": return 1.5;
      case "medium":
      default: return 1;
    }
  };

  // Estimate pet bounding box for click-through fallback
  // When elementFromPoint returns null through click-through windows,
  // use pet positions from store to determine if cursor is over a pet
  const checkPetBoundingBox = useCallback((mouseX: number, mouseY: number): boolean => {
    // Pet character is roughly 100x100px at medium scale
    // Use a conservative hit area of 80x80px scaled by size
    const BASE_WIDTH = 80;
    const BASE_HEIGHT = 80;

    for (const pet of pets) {
      const scale = getSizeScale(size);
      const halfWidth = (BASE_WIDTH * scale) / 2;
      const halfHeight = (BASE_HEIGHT * scale) / 2;

      // Pet position is center of widget, check if mouse is within bounds
      if (
        mouseX >= pet.x - halfWidth &&
        mouseX <= pet.x + halfWidth &&
        mouseY >= pet.y - halfHeight &&
        mouseY <= pet.y + halfHeight
      ) {
        return true;
      }
    }
    return false;
  }, [pets, size]);

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
        // Fallback: check if mouse is over a pet using bounding box
        // This handles the case where elementFromPoint returns null
        // while click-through is active but cursor is actually over the pet
        if (checkPetBoundingBox(x, y)) {
          shouldIgnore = false;
        }
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
  }, [checkPetBoundingBox]);

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