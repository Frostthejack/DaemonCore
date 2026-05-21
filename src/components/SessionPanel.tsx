import { useState, useEffect } from "react";
import { usePetSystemStore } from "../store/petSystem";
import { CHARACTER_REGISTRY } from "../types/pet";
import type { PetName, PetState, ProfileName, Session } from "../types/pet";

// ── State display config ───────────────────────────────────────────────

const PET_STATE_CONFIG: Record<PetState, { label: string; color: string }> = {
  idle: { label: "Idle", color: "rgba(255,255,255,0.5)" },
  thinking: { label: "Thinking", color: "#a78bfa" },
  working: { label: "Working", color: "#60a5fa" },
  done: { label: "Done", color: "#4ade80" },
  error: { label: "Error", color: "#f87171" },
  notification: { label: "Alert", color: "#facc15" },
  dragging: { label: "Dragging", color: "#e879f9" },
  sleeping: { label: "Sleeping", color: "#818cf8" },
};

const ALL_STATES: PetState[] = [
  "idle",
  "thinking",
  "working",
  "done",
  "error",
  "notification",
  "sleeping",
];

const ALL_CHARACTERS: PetName[] = [
  "owl",
  "brain",
  "terminal",
  "magnifying",
  "paw",
  "pixie",
];

// ── Status helper ──────────────────────────────────────────────────────

function getStatus(state: PetState): "active" | "idle" | "error" {
  if (state === "error") return "error";
  if (state === "idle" || state === "sleeping") return "idle";
  return "active";
}

function getStatusLabel(status: "active" | "idle" | "error") {
  return status === "active" ? "Active" : status === "error" ? "Error" : "Idle";
}

function getStatusColor(status: "active" | "idle" | "error") {
  return status === "active"
    ? "#4ade80"
    : status === "error"
      ? "#f87171"
      : "#facc15";
}

// ── State Dropdown ──────────────────────────────────────────────────────

function StateDropdown({
  profile,
  currentState,
  onStateChange,
}: {
  profile: ProfileName;
  currentState: PetState;
  onStateChange: (profile: ProfileName, state: PetState) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = PET_STATE_CONFIG[currentState];

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <button
        className="char-selector-toggle"
        onClick={() => setOpen(!open)}
        style={{ color: cfg.color }}
      >
        {cfg.label} ▾
      </button>
      {open && (
        <div className="char-selector-dropdown">
          {ALL_STATES.map((state) => {
            const sc = PET_STATE_CONFIG[state];
            return (
              <button
                key={state}
                className={`char-option ${state === currentState ? "active" : ""}`}
                onClick={() => {
                  onStateChange(profile, state);
                  setOpen(false);
                }}
              >
                <span className="char-option-name" style={{ color: sc.color }}>
                  {sc.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Character Dropdown ──────────────────────────────────────────────────

function CharacterDropdown({
  profile,
  currentCharacter,
  onCharacterChange,
}: {
  profile: ProfileName;
  currentCharacter: PetName;
  onCharacterChange: (profile: ProfileName, character: PetName) => void;
}) {
  const [open, setOpen] = useState(false);
  const charDef = CHARACTER_REGISTRY[currentCharacter];

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <button
        className="char-selector-toggle"
        onClick={() => setOpen(!open)}
      >
        {charDef.label} ▾
      </button>
      {open && (
        <div className="char-selector-dropdown">
          {ALL_CHARACTERS.map((charId) => {
            const def = CHARACTER_REGISTRY[charId];
            return (
              <button
                key={charId}
                className={`char-option ${charId === currentCharacter ? "active" : ""}`}
                onClick={() => {
                  onCharacterChange(profile, charId);
                  setOpen(false);
                }}
              >
                <span className="char-option-name">{def.label}</span>
                <span className="char-option-desc">{def.description}</span>
                <span className="char-option-style">{def.style}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Session Card ────────────────────────────────────────────────────────

function SessionCard({
  session,
  characterId,
  state,
  x,
  y,
  onStateChange,
  onCharacterChange,
  onRemove,
}: {
  session: Session;
  characterId: PetName;
  state: PetState;
  x: number;
  y: number;
  onStateChange: (profile: ProfileName, state: PetState) => void;
  onCharacterChange: (profile: ProfileName, character: PetName) => void;
  onRemove: (profile: ProfileName) => void;
}) {
  const status = getStatus(state);
  const statusColor = getStatusColor(status);

  // Format session duration
  const duration = Math.floor((Date.now() - session.startTime) / 1000);
  const durationStr = duration < 60
    ? `${duration}s`
    : `${Math.floor(duration / 60)}m ${duration % 60}s`;

  return (
    <div
      className="session-card"
      style={{
        borderColor: status === "error" ? "rgba(239,68,68,0.3)" : status === "active" ? "rgba(100,100,255,0.4)" : "rgba(255,255,255,0.08)",
      }}
    >
      {/* Card Header */}
      <div className="session-card-header">
        <div className="session-card-title">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: statusColor,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span className="session-card-title-text">{session.name}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: statusColor,
              textTransform: "uppercase" as const,
              letterSpacing: 0.5,
            }}
          >
            {getStatusLabel(status)}
          </span>
        </div>
        <button
          className="pet-remove"
          onClick={() => onRemove(session.profileName)}
          title="Remove session"
        >
          ✕
        </button>
      </div>

      {/* Card Body */}
      <div className="session-card-body">
        <div className="session-card-row">
          <span className="session-card-label">Profile</span>
          <span className="session-card-value">{session.profileName}</span>
        </div>

        <div className="session-card-row">
          <span className="session-card-label">Duration</span>
          <span className="session-card-value">{durationStr}</span>
        </div>

        <div className="session-card-row">
          <span className="session-card-label">State</span>
          <StateDropdown
            profile={session.profileName}
            currentState={state}
            onStateChange={onStateChange}
          />
        </div>

        <div className="session-card-row">
          <span className="session-card-label">Character</span>
          <CharacterDropdown
            profile={session.profileName}
            currentCharacter={characterId}
            onCharacterChange={onCharacterChange}
          />
        </div>

        <div className="session-card-row">
          <span className="session-card-label">Position</span>
          <span className="session-card-value">
            ({Math.round(x)}, {Math.round(y)})
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────

interface SessionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionPanel({ isOpen, onClose }: SessionPanelProps) {
  const sessions = usePetSystemStore((s) => s.sessions);
  const pets = usePetSystemStore((s) => s.pets);
  const spawnPet = usePetSystemStore((s) => s.spawnPet);
  const removePet = usePetSystemStore((s) => s.removePet);
  const setPetState = usePetSystemStore((s) => s.setPetState);
  const setCharacterForProfile = usePetSystemStore((s) => s.setCharacterForProfile);

  const [newProfile, setNewProfile] = useState("");

  // Listen for session events from Tauri backend
  useEffect(() => {
    const unsubscribe = usePetSystemStore.subscribe((_state, _prevState) => {
      // Handle session events from the backend
      // This would be connected via Tauri event listeners in a real implementation
    });
    return () => unsubscribe();
  }, []);

  const handleStateChange = (profile: ProfileName, state: PetState) => {
    setPetState(profile, state);
  };

  const handleCharacterChange = (profile: ProfileName, character: PetName) => {
    setCharacterForProfile(profile, character);
  };

  const handleRemove = (profile: ProfileName) => {
    removePet(profile);
  };

  const handleSpawn = () => {
    if (newProfile.trim()) {
      spawnPet(newProfile.trim() as ProfileName);
      setNewProfile("");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="session-panel-backdrop"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="session-panel">
        {/* Header */}
        <div className="manager-header">
          <h2>Active Sessions</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Session List */}
        <div className="session-panel-list">
          {sessions.length === 0 ? (
            <div className="session-panel-empty">
              <p className="session-panel-empty-text">No active sessions</p>
              <p className="session-panel-empty-hint">
                Sessions will appear here when Hermes starts working
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              // Find the corresponding pet for this session
              const pet = pets.find((p) => p.profileName === session.profileName);
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  characterId={pet?.characterId || session.character}
                  state={pet?.state || "idle"}
                  x={pet?.x || 0}
                  y={pet?.y || 0}
                  onStateChange={handleStateChange}
                  onCharacterChange={handleCharacterChange}
                  onRemove={handleRemove}
                />
              );
            })
          )}
        </div>

        {/* Spawn Controls */}
        <div className="session-panel-spawn">
          <div className="pet-spawn">
            <input
              type="text"
              placeholder="Profile name..."
              value={newProfile}
              onChange={(e) => setNewProfile(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSpawn();
              }}
            />
            <button onClick={handleSpawn}>Spawn</button>
          </div>
        </div>

        {/* Footer */}
        <div className="session-panel-footer">
          <span className="session-panel-footer-text">
            {sessions.length} active session{sessions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </>
  );
}

export default SessionPanel;