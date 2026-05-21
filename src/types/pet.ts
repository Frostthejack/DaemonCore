export type PetName = "owl" | "brain" | "terminal" | "magnifying" | "paw" | "pixie";
export type PetSize = "small" | "medium" | "large";

export type PetState =
  | "idle"
  | "thinking"
  | "working"
  | "done"
  | "error"
  | "dragging"
  | "notification"
  | "sleeping";

// Granular sub-states for tool-specific pet reactions
// These map to specific Hermes tool categories for nuanced animations
export type PetSubState =
  // Within 'working': terminal operations
  | "terminal_work"      // terminal, patch, git commands
  // Within 'working': code operations
  | "code_work"          // execute_code, delegate_task
  // Within 'thinking': search operations
  | "searching"          // web_search, read_file, read
  // Within 'thinking': analysis
  | "analyzing"          // execute_code (analysis mode)
  // New emotional states
  | "curious"            // search/read operations - investigating
  | "excited"            // image/audio generation - creative output
  | "surprised";         // clarify - needs user input

// Priority mapping for sub-states (higher = more important)
export const PET_SUBSTATE_PRIORITY: Record<PetSubState, number> = {
  terminal_work: 5,
  code_work: 4,
  searching: 3,
  analyzing: 3,
  curious: 2,
  excited: 2,
  surprised: 1,
};

export const PET_STATE_PRIORITY: Record<PetState, number> = {
  dragging: 10,
  error: 8,
  notification: 7,
  done: 5,
  working: 3,
  thinking: 2,
  idle: 1,
  sleeping: 0,
};

// Character metadata
export interface CharacterDef {
  id: PetName;
  label: string;
  description: string;
  style: "cartoon" | "abstract";
}

export const CHARACTER_REGISTRY: Record<PetName, CharacterDef> = {
  owl: {
    id: "owl",
    label: "Owl",
    description: "A wise cartoon owl with expressive eyes, feather details, and ear tufts. The default companion.",
    style: "cartoon",
  },
  brain: {
    id: "brain",
    label: "Brain",
    description: "A glowing pink brain with pulsing neural connections. For deep thinking sessions.",
    style: "abstract",
  },
  terminal: {
    id: "terminal",
    label: "Terminal",
    description: "A retro green-on-black terminal cursor, blinking and ready for commands.",
    style: "abstract",
  },
  magnifying: {
    id: "magnifying",
    label: "Magnifier",
    description: "A friendly magnifying glass that loves investigating things. Curious by nature.",
    style: "cartoon",
  },
  paw: {
    id: "paw",
    label: "Paw",
    description: "A soft, round paw pad that stretches and boops. Loyal and playful.",
    style: "cartoon",
  },
  pixie: {
    id: "pixie",
    label: "Pixie",
    description: "A cloud of glowing fairy dust and sparkles. Abstract, ethereal, and magical.",
    style: "abstract",
  },
};

// Hermes profile name used as pet identity
export type ProfileName = string;

// Session status
export type SessionStatus = "active" | "idle" | "ended";

// Hermes session with lifecycle tracking
export interface Session {
  id: string;
  profileName: ProfileName;
  name: string;
  status: SessionStatus;
  character: PetName;
  startTime: number;  // Unix timestamp
  lastUpdate?: number;  // Unix timestamp
}

// Per-pet runtime state
export interface PetInstance {
  profileName: ProfileName;
  characterId: PetName;
  state: PetState;
  subState?: PetSubState;  // Optional granular state for tool-specific reactions
  x: number;
  y: number;
}

// Webhook event payload emitted by the Rust backend via Tauri events
export interface PetStateEvent {
  event_type: string;
  profile_name: string;
  session_id?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  // Optional sub-state for granular tool-specific reactions
  sub_state?: PetSubState;
}

// Session lifecycle event types
export type SessionEventType = "session_start" | "session_end" | "session_update";

export interface SessionEvent {
  event_type: SessionEventType;
  session_id: string;
  profile_name: string;
  session_name?: string;
  character?: PetName;
  status?: SessionStatus;
  timestamp?: number;
}
