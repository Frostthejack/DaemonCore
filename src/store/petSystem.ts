import { create } from "zustand";
import type { PetName, PetState, ProfileName, PetInstance } from "../types/pet";

// ─── Profile → Character mapping ─────────────────────────────
// Persists which character each Hermes profile uses

interface ProfileCharacterMap {
  [profileName: string]: PetName;
}

// ─── Store ───────────────────────────────────────────────────
interface PetSystemStore {
  // Active pets (one per profile)
  pets: PetInstance[];

  // Profile → character assignment (persisted)
  profileCharacters: ProfileCharacterMap;
  setCharacterForProfile: (profile: ProfileName, character: PetName) => void;
  getCharacterForProfile: (profile: ProfileName) => PetName;

  // Pet lifecycle
  spawnPet: (profile: ProfileName, character?: PetName) => void;
  removePet: (profile: ProfileName) => void;

  // State management (priority-aware)
  setPetState: (profile: ProfileName, state: PetState) => void;
  getPetState: (profile: ProfileName) => PetState;

  // Position
  setPetPosition: (profile: ProfileName, x: number, y: number) => void;

  // Global settings
  followMouse: boolean;
  followDistance: number;
  setFollowMouse: (enabled: boolean) => void;
  setFollowDistance: (distance: number) => void;
}

// Default character per profile (first spawn)
const DEFAULT_CHARACTER: PetName = "owl";

// Load persisted state from localStorage
function loadPersisted(): {
  profileCharacters: ProfileCharacterMap;
  followMouse: boolean;
  followDistance: number;
} {
  try {
    const raw = localStorage.getItem("daemoncore-pets");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        profileCharacters: parsed.profileCharacters || {},
        followMouse: parsed.followMouse ?? false,
        followDistance: parsed.followDistance ?? 120,
      };
    }
  } catch {
    // ignore
  }
  return { profileCharacters: {}, followMouse: false, followDistance: 120 };
}

function persistState(
  profileCharacters: ProfileCharacterMap,
  followMouse: boolean,
  followDistance: number
) {
  try {
    localStorage.setItem(
      "daemoncore-pets",
      JSON.stringify({ profileCharacters, followMouse, followDistance })
    );
  } catch {
    // ignore
  }
}

const persisted = loadPersisted();

export const usePetSystemStore = create<PetSystemStore>((set, get) => ({
  pets: [],

  profileCharacters: persisted.profileCharacters,

  setCharacterForProfile: (profile, character) => {
    const map = { ...get().profileCharacters, [profile]: character };
    set({ profileCharacters: map });
    persistState(map, get().followMouse, get().followDistance);

    // Update existing pet's character if spawned
    const pets = get().pets.map((p) =>
      p.profileName === profile ? { ...p, characterId: character } : p
    );
    set({ pets });
  },

  getCharacterForProfile: (profile) => {
    return get().profileCharacters[profile] || DEFAULT_CHARACTER;
  },

  spawnPet: (profile, character) => {
    const state = get();
    // Don't duplicate
    if (state.pets.find((p) => p.profileName === profile)) return;

    const charId = character || state.profileCharacters[profile] || DEFAULT_CHARACTER;
    const offsetX = Math.random() * 200 - 100;
    const offsetY = Math.random() * 200 - 100;

    const newPet: PetInstance = {
      profileName: profile,
      characterId: charId,
      state: "idle",
      x: window.innerWidth / 2 + offsetX,
      y: window.innerHeight / 2 + offsetY,
    };

    set({ pets: [...state.pets, newPet] });
  },

  removePet: (profile) => {
    set({ pets: get().pets.filter((p) => p.profileName !== profile) });
  },

  setPetState: (profile, newState) => {
    const pets = get().pets.map((p) => {
      if (p.profileName !== profile) return p;
      return { ...p, state: newState };
    });
    set({ pets });
  },

  getPetState: (profile) => {
    const pet = get().pets.find((p) => p.profileName === profile);
    return pet?.state || "idle";
  },

  setPetPosition: (profile, x, y) => {
    const pets = get().pets.map((p) =>
      p.profileName === profile ? { ...p, x, y } : p
    );
    set({ pets });
  },

  followMouse: persisted.followMouse,
  followDistance: persisted.followDistance,

  setFollowMouse: (enabled) => {
    set({ followMouse: enabled });
    persistState(get().profileCharacters, enabled, get().followDistance);
  },

  setFollowDistance: (distance) => {
    set({ followDistance: distance });
    persistState(get().profileCharacters, get().followMouse, distance);
  },
}));
