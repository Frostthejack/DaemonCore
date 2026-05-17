export type PetName = "owl" | "brain" | "terminal" | "magnifying" | "paw";
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
