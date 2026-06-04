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

// Animation variant for pet state animations
export interface AnimationVariant {
  id: string;
  name: string;
  duration: number;
}

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

// Registry mapping pet states to their animation variants
export type AnimationRegistry = {
  idle: AnimationVariant[];
  thinking: AnimationVariant[];
  working: AnimationVariant[];
  done: AnimationVariant[];
  error: AnimationVariant[];
};

// Sub-state animation mapping - maps sub-states to animation names
export type SubStateAnimationMap = {
  [key in PetSubState]?: string;
};

// Parent state fallback mapping for sub-states
export const SUBSTATE_PARENT_STATE: Partial<Record<PetSubState, PetState>> = {
  terminal_work: "working",
  code_work: "working",
  searching: "thinking",
  analyzing: "thinking",
  curious: "thinking",
  excited: "working",
  surprised: "idle",
};

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
  // Animation mappings for sub-states - maps sub-state to animation name
  animations?: SubStateAnimationMap;
}

// Animation mappings for each character's sub-states
// Each sub-state maps to a distinct animation that reflects its mood
export const CHARACTER_ANIMATIONS: Record<PetName, SubStateAnimationMap> = {
  owl: {
    terminal_work: "terminal-glow",
    code_work: "code-typing",
    searching: "head-tilt",
    analyzing: "eye-focus",
    curious: "peering",
    excited: "bounce",
    surprised: "startled",
  },
  brain: {
    terminal_work: "neural-pulse",
    code_work: "synapse-flash",
    searching: "wave-scan",
    analyzing: "deep-focus",
    curious: "pulse-inquiry",
    excited: "spark-burst",
    surprised: "jolt",
  },
  terminal: {
    terminal_work: "cursor-blink-fast",
    code_work: "keystroke",
    searching: "scan-line",
    analyzing: "process-bar",
    curious: "prompt-blink",
    excited: "glitch",
    surprised: "error-flash",
  },
  magnifying: {
    terminal_work: "glass-glide",
    code_work: "inspect",
    searching: "sweep",
    analyzing: "zoom",
    curious: "tilt",
    excited: "spin",
    surprised: "shake",
  },
  paw: {
    terminal_work: "tap",
    code_work: "stretch",
    searching: "lift",
    analyzing: "tilt",
    curious: "nudge",
    excited: "boing",
    surprised: "jump",
  },
  pixie: {
    terminal_work: "spark-trail",
    code_work: "dust-swirl",
    searching: "glow-pulse",
    analyzing: "orbital",
    curious: "flicker",
    excited: "explosion",
    surprised: "scatter",
  },
};

export const CHARACTER_REGISTRY: Record<PetName, CharacterDef> = {
  owl: {
    id: "owl",
    label: "Owl",
    description: "A wise cartoon owl with expressive eyes, feather details, and ear tufts. The default companion.",
    style: "cartoon",
    animations: CHARACTER_ANIMATIONS.owl,
  },
  brain: {
    id: "brain",
    label: "Brain",
    description: "A glowing pink brain with pulsing neural connections. For deep thinking sessions.",
    style: "abstract",
    animations: CHARACTER_ANIMATIONS.brain,
  },
  terminal: {
    id: "terminal",
    label: "Terminal",
    description: "A retro green-on-black terminal cursor, blinking and ready for commands.",
    style: "abstract",
    animations: CHARACTER_ANIMATIONS.terminal,
  },
  magnifying: {
    id: "magnifying",
    label: "Magnifier",
    description: "A friendly magnifying glass that loves investigating things. Curious by nature.",
    style: "cartoon",
    animations: CHARACTER_ANIMATIONS.magnifying,
  },
  paw: {
    id: "paw",
    label: "Paw",
    description: "A soft, round paw pad that stretches and boops. Loyal and playful.",
    style: "cartoon",
    animations: CHARACTER_ANIMATIONS.paw,
  },
  pixie: {
    id: "pixie",
    label: "Pixie",
    description: "A cloud of glowing fairy dust and sparkles. Abstract, ethereal, and magical.",
    style: "abstract",
    animations: CHARACTER_ANIMATIONS.pixie,
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
  // Optional tool name extracted from metadata for tool-specific reactions
  // Backward compatible: undefined for events without tool names
  tool_name?: string;
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
