import { create } from "zustand";
import type {
  PetName,
  PetState,
  PetSubState,
  ProfileName,
  PetInstance,
  Session,
  SessionEvent,
} from "../types/pet";
import { CHARACTER_ANIMATIONS } from "../types/pet";

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
  setPetState: (profile: ProfileName, state: PetState, subState?: PetSubState) => void;
  getPetState: (profile: ProfileName) => PetState;
  getPetSubState: (profile: ProfileName) => PetSubState | undefined;

  // Animation tracking
  setPetAnimation: (profile: ProfileName, animation: string) => void;
  getPetAnimation: (profile: ProfileName) => string | undefined;

  // Position
  setPetPosition: (profile: ProfileName, x: number, y: number) => void;

  // Global settings
  followMouse: boolean;
  followDistance: number;
  setFollowMouse: (enabled: boolean) => void;
  setFollowDistance: (distance: number) => void;

  // Session tracking
  sessions: Session[];
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Omit<Session, 'id'>>) => void;
  removeSession: (sessionId: string) => void;
  handleSessionEvent: (event: SessionEvent) => void;
  getSessionByProfile: (profile: ProfileName) => Session | undefined;
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

  setPetState: (profile, newState, newSubState) => {
    const pets = get().pets.map((p) => {
      if (p.profileName !== profile) return p;
      return { ...p, state: newState, subState: newSubState };
    });
    set({ pets });
  },

  getPetState: (profile) => {
    const pet = get().pets.find((p) => p.profileName === profile);
    return pet?.state || "idle";
  },

  getPetSubState: (profile) => {
    const pet = get().pets.find((p) => p.profileName === profile);
    return pet?.subState;
  },

  setPetAnimation: (profile, animation) => {
    const pets = get().pets.map((p) =>
      p.profileName === profile ? { ...p, currentAnimation: animation } : p
    );
    set({ pets });
  },

  getPetAnimation: (profile) => {
    const pet = get().pets.find((p) => p.profileName === profile);
    if (pet?.currentAnimation) return pet.currentAnimation;
    // Derive from CHARACTER_ANIMATIONS[characterId][subState]
    if (pet?.subState && pet?.characterId) {
      const charAnims = CHARACTER_ANIMATIONS[pet.characterId];
      if (charAnims?.[pet.subState]) return charAnims[pet.subState];
    }
    return undefined;
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

  // Session tracking
  sessions: [],

  addSession: (session) => {
    const existing = get().sessions.find((s) => s.id === session.id);
    if (existing) return;
    set({ sessions: [...get().sessions, session] });
  },

  updateSession: (sessionId, updates) => {
    const sessions = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, ...updates, lastUpdate: Date.now() } : s
    );
    set({ sessions });
  },

  removeSession: (sessionId) => {
    set({ sessions: get().sessions.filter((s) => s.id !== sessionId) });
  },

  handleSessionEvent: (event) => {
    const state = get();
    switch (event.event_type) {
      case "session_start": {
        const character = event.character || state.getCharacterForProfile(event.profile_name);
        const newSession: Session = {
          id: event.session_id,
          profileName: event.profile_name,
          name: event.session_name || `Session ${event.session_id.slice(0, 8)}`,
          status: "active",
          character,
          startTime: event.timestamp || Date.now(),
        };
        state.addSession(newSession);
        // Also spawn a pet for this session
        state.spawnPet(event.profile_name, character);
        break;
      }
      case "session_update": {
        state.updateSession(event.session_id, {
          status: event.status || "active",
          character: event.character,
        });
        break;
      }
      case "session_end": {
        state.updateSession(event.session_id, { status: "ended" });
        // Remove pet when session ends
        state.removePet(event.profile_name);
        // Keep session in list for history, or remove after delay
        setTimeout(() => state.removeSession(event.session_id), 5000);
        break;
      }
    }
  },

  getSessionByProfile: (profile) => {
    return get().sessions.find((s) => s.profileName === profile && s.status === "active");
  },
}));