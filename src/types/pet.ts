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

// Per-pet runtime state
export interface PetInstance {
  profileName: ProfileName;
  characterId: PetName;
  state: PetState;
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
}
