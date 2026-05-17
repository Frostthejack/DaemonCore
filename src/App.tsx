import { useEffect, useState } from "react";
import { PetWidget } from "./components/PetWidget";
import { SettingsPanel } from "./components/SettingsPanel";
import { SessionPanel } from "./components/SessionPanel";
import { useAppConfig } from "./hooks/useAppConfig";
import { usePetSystemStore } from "./store/petSystem";
import { CHARACTER_REGISTRY } from "./types/pet";
import type { ProfileName } from "./types/pet";
import "./App.css";

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
