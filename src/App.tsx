import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { PetWidget } from "./components/PetWidget";
import { useAppConfig } from "./hooks/useAppConfig";
import { usePetSystemStore } from "./store/petSystem";
import type { PetState, SessionEvent } from "./types/pet";
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

// Validate session event payload
function isValidSessionEvent(payload: unknown): payload is SessionEvent {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.event_type === "string" &&
    ["session_start", "session_end", "session_update"].includes(p.event_type) &&
    typeof p.session_id === "string" &&
    typeof p.profile_name === "string"
  );
}

// ─── Main App ────────────────────────────────────────────────
function App() {
  const { showPet, theme } = useAppConfig();
  const pets = usePetSystemStore((s) => s.pets);

  // Spawn default pet on mount
  useEffect(() => {
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
        const existingPet = store.pets.find((p) => p.profileName === profile_name);
        if (!existingPet) {
          store.spawnPet(profile_name as import("./types/pet").ProfileName);
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

  // Listen for session lifecycle events
  useEffect(() => {
    const unlisten = listen<unknown>("session_event", (event) => {
      try {
        const payload = event.payload;
        if (!isValidSessionEvent(payload)) {
          console.warn("[session] Malformed session event received, ignoring:", payload);
          return;
        }

        const store = usePetSystemStore.getState();
        store.handleSessionEvent(payload);
        console.debug(`[session] ${payload.event_type} for ${payload.session_id}`);
      } catch (err) {
        console.error("[session] Error processing session event:", err);
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
        />
      ))}
    </main>
  );
}

export default App;
