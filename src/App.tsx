import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { PetWidget } from "./components/PetWidget";
import { SettingsPanel } from "./components/SettingsPanel";
import { SessionPanel } from "./components/SessionPanel";
import { useAppConfig } from "./hooks/useAppConfig";
import { usePetSystemStore } from "./store/petSystem";
import { CHARACTER_REGISTRY } from "./types/pet";
import type { ProfileName, PetState } from "./types/pet";
import "./App.css";

// ─── Hermes event → PetState mapping ──────────────────────────
const HERMES_EVENT_TO_PET_STATE: Record<string, PetState> = {
  agent_start: "idle",
  agent_thinking: "thinking",
  agent_working: "working",
  agent_done: "done",
  agent_error: "error",
  agent_notification: "notification",
  agent_sleep: "sleeping",
};

// Validate that a payload from the webhook is well-formed
function isValidWebhookPayload(payload: unknown): payload is {
  event_type: string;
  profile_name: string;
} {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.event_type === "string" && typeof p.profile_name === "string";
}

// ─── Character Selector Panel ────────────────────────────────
function CharacterSelector({ profile }: { profile: ProfileName }) {
  const [open, setOpen] = useState(false);
  const { getCharacterForProfile, setCharacterForProfile } = usePetSystemStore();
  const currentChar = getCharacterForProfile(profile);

  return (
    <div className="char-selector">
      <button className="char-selector-toggle" onClick={() => setOpen(!open)}>
        {CHARACTER_REGISTRY[currentChar].label} ▾
      </button>
      {open && (
        <div className="char-selector-dropdown">
          {Object.values(CHARACTER_REGISTRY).map((char) => (
            <button
              key={char.id}
              className={`char-option ${char.id === currentChar ? "active" : ""}`}
              onClick={() => {
                setCharacterForProfile(profile, char.id);
                setOpen(false);
              }}
            >
              <span className="char-option-name">{char.label}</span>
              <span className="char-option-desc">{char.description}</span>
              <span className="char-option-style">{char.style}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pet Manager Panel ───────────────────────────────────────
function PetManager() {
  const pets = usePetSystemStore((s) => s.pets);
  const spawnPet = usePetSystemStore((s) => s.spawnPet);
  const removePet = usePetSystemStore((s) => s.removePet);
  const followMouse = usePetSystemStore((s) => s.followMouse);
  const setFollowMouse = usePetSystemStore((s) => s.setFollowMouse);
  const [newProfile, setNewProfile] = useState("");

  return (
    <div className="pet-manager">
      <h3>Active Pets</h3>
      {pets.length === 0 && <p className="no-pets">No pets spawned yet.</p>}
      {pets.map((pet) => (
        <div key={pet.profileName} className="pet-manager-entry">
          <span className="pet-manager-name">{pet.profileName}</span>
          <CharacterSelector profile={pet.profileName} />
          <button className="pet-remove" onClick={() => removePet(pet.profileName)}>✕</button>
        </div>
      ))}

      <div className="pet-spawn">
        <input
          type="text"
          placeholder="Profile name..."
          value={newProfile}
          onChange={(e) => setNewProfile(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newProfile.trim()) {
              spawnPet(newProfile.trim() as ProfileName);
              setNewProfile("");
            }
          }}
        />
        <button onClick={() => {
          if (newProfile.trim()) {
            spawnPet(newProfile.trim() as ProfileName);
            setNewProfile("");
          }
        }}>Spawn</button>
      </div>

      <div className="pet-settings">
        <label>
          <input
            type="checkbox"
            checked={followMouse}
            onChange={(e) => setFollowMouse(e.target.checked)}
          />
          Follow mouse
        </label>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────
function App() {
  const { showPet, theme, isSoundsEnabled } = useAppConfig();
  const pets = usePetSystemStore((s) => s.pets);
  const [managerOpen, setManagerOpen] = useState(false);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);

  // Spawn default pets on mount (will be replaced by Hermes webhook later)
  useEffect(() => {
    // Auto-spawn a default pet for testing
    const store = usePetSystemStore.getState();
    if (store.pets.length === 0) {
      store.spawnPet("default");
    }
  }, []);

  // Listen for webhook events from the Rust backend
  useEffect(() => {
    const unlisten = listen<unknown>("hermes_event", (event) => {
      try {
        const payload = event.payload;
        if (!isValidWebhookPayload(payload)) {
          console.warn("[webhook] Malformed payload received, ignoring:", payload);
          return;
        }

        const { event_type, profile_name } = payload;
        const petState = HERMES_EVENT_TO_PET_STATE[event_type];
        if (!petState) {
          console.warn(`[webhook] Unknown event_type "${event_type}", ignoring`);
          return;
        }

        const store = usePetSystemStore.getState();
        // Auto-spawn a pet for this profile if one doesn't exist yet
        const existingPet = store.pets.find((p) => p.profileName === profile_name);
        if (!existingPet) {
          store.spawnPet(profile_name as ProfileName);
        }
        store.setPetState(profile_name, petState);
        console.debug(`[webhook] ${event_type} → ${petState} for ${profile_name}`);
      } catch (err) {
        console.error("[webhook] Error processing event:", err);
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <main className={`container theme-${theme}`}>
      {showPet && pets.map((pet, i) => (
        <PetWidget
          key={pet.profileName}
          petName={pet.characterId}
          profileName={pet.profileName}
          initialX={window.innerWidth / 2 - 75 + (i * 160)}
          isSoundsEnabled={isSoundsEnabled}
        />
      ))}

      {/* Manager toggle */}
      <button
        className="manager-toggle"
        onClick={() => setManagerOpen(!managerOpen)}
        title="Manage pets"
      >
        🐾
      </button>

      {/* Manager panel */}
      {managerOpen && (
        <div className="manager-panel">
          <div className="manager-header">
            <h2>DaemonCore</h2>
            <button onClick={() => setManagerOpen(false)}>✕</button>
          </div>
          <PetManager />
          <SettingsPanel />
        </div>
      )}

      {/* Session Panel */}
      <SessionPanel
        isOpen={sessionPanelOpen}
        onClose={() => setSessionPanelOpen(false)}
      />

      {/* Session panel toggle */}
      <button
        className="manager-toggle"
        onClick={() => setSessionPanelOpen(!sessionPanelOpen)}
        title="Session panel"
        style={{ bottom: 80 }}
      >
        ⏺
      </button>
    </main>
  );
}

export default App;
