import { useState, useEffect, useCallback, useRef } from "react";
import { usePetMovement } from "../hooks/usePetMovement";
import { usePetSystemStore } from "../store/petSystem";
import { CharacterRenderer } from "./characters/CharacterRenderer";
import { useSoundManager } from "../hooks/useSoundManager";
import type { PetName, PetState, PetSubState } from "../types/pet";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

interface PetWidgetProps {
  petName: PetName;
  profileName: string;
  initialX: number;
}

// ─── Priority State Machine ───────────────────────────────────
// Higher priority states override lower ones.
// Dragging always wins. Error/notification override working/thinking.

const STATE_PRIORITY: Record<PetState, number> = {
  dragging: 10,
  error: 8,
  notification: 7,
  done: 5,
  working: 3,
  thinking: 2,
  idle: 1,
  sleeping: 0,
};

function resolveState(current: PetState, incoming: PetState): PetState {
  if (STATE_PRIORITY[incoming] >= STATE_PRIORITY[current]) return incoming;
  return current;
}

// ─── Cross-fade SVG renderer ─────────────────────────────────
// Cross-fades on both state changes AND animation variant changes.
// Uses a dual-layer approach: when the animation variant changes,
// the old animation fades out and the new one fades in (150ms).
function PetCharacter({
  characterId,
  state,
  subState,
  direction,
  eyeX,
  eyeY,
  animationName,
}: {
  characterId: PetName;
  state: PetState;
  subState?: PetSubState;
  direction: number;
  eyeX: number;
  eyeY: number;
  animationName?: string;
}) {
  const [displayState, setDisplayState] = useState(state);
  const [displayAnimation, setDisplayAnimation] = useState(animationName);
  const [fading, setFading] = useState(false);
  const prevStateRef = useRef(state);
  const prevAnimationRef = useRef(animationName);

  // Cross-fade on state change
  useEffect(() => {
    if (state !== prevStateRef.current) {
      setFading(true);
      const timer = setTimeout(() => {
        setDisplayState(state);
        prevStateRef.current = state;
        setFading(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Cross-fade on animation variant change
  useEffect(() => {
    if (animationName !== prevAnimationRef.current) {
      setFading(true);
      const timer = setTimeout(() => {
        setDisplayAnimation(animationName);
        prevAnimationRef.current = animationName;
        setFading(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [animationName]);

  const flip = direction < 0 ? "scale(-1, 1)" : "";
  const animClass = displayAnimation ? `anim-${displayAnimation}` : "";

  return (
    <div
      className={`pet-character-svg-wrapper ${animClass}`}
      style={{
        opacity: fading ? 0.5 : 1,
        transition: "opacity 150ms ease-in-out",
        transform: flip,
      }}
    >
      <CharacterRenderer
        characterId={characterId}
        state={displayState}
        subState={subState}
        eyeX={eyeX}
        eyeY={eyeY}
      />
    </div>
  );
}

// ─── Main Pet Widget ─────────────────────────────────────────
export function PetWidget({ petName, profileName, initialX }: PetWidgetProps) {
  const [followTarget, setFollowTarget] = useState<{ x: number; y: number } | null>(null);

  // Initialize sound manager
  const { playStateSound } = useSoundManager();

  const characterId = usePetSystemStore((s) => s.getCharacterForProfile(profileName));
  const setPetState = usePetSystemStore((s) => s.setPetState);
  const setPetPosition = usePetSystemStore((s) => s.setPetPosition);
  const followMouse = usePetSystemStore((s) => s.followMouse);
  const followDistance = usePetSystemStore((s) => s.followDistance);
  const currentAnimation = usePetSystemStore((s) => s.getPetAnimation(profileName));

  const { position, isDragging, directionRef, widgetRef, handleMouseDown, getSizeScale } =
    usePetMovement({ petName, size: "medium", initialX, followTarget, followDistance: followDistance });

  // Sync position to store for click-through bounding-box checks
  // Also sync to Rust backend for hit-testing
  useEffect(() => {
    setPetPosition(profileName, position.x, position.y);
    
    // Sync to Rust backend for hit-testing
    // Pet character is 150x150px at medium scale, centered on position
    const scale = getSizeScale();
    const width = 150 * scale;
    const height = 150 * scale;
    // Position is center, so top-left is position - width/2, height/2
    const x = position.x - width / 2;
    const y = position.y - height / 2;
    
    invoke("update_pet_position", {
      profileName,
      x,
      y,
      width,
      height,
    }).catch((e) => {
      console.error("[PetWidget] Failed to update pet position in Rust:", e);
    });
  }, [position.x, position.y, profileName, setPetPosition, getSizeScale]);

  const [currentState, setCurrentState] = useState<PetState>("idle");
  const [currentSubState, setCurrentSubState] = useState<PetSubState | undefined>(undefined);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateRef = useRef<PetState>("idle");
  
  const applyState = useCallback((newState: PetState, newSubState?: PetSubState) => {
    setCurrentState((prev) => {
      const resolved = resolveState(prev, newState);
      setPetState(profileName, resolved, newSubState);
      
      // Play sound on state change (respects isSoundsEnabled internally)
      if (prevStateRef.current !== resolved) {
        playStateSound(resolved);
        prevStateRef.current = resolved;
      }
      
      return resolved;
    });
    if (newSubState !== undefined) {
      setCurrentSubState(newSubState);
    }
  }, [profileName, setPetState, playStateSound]);

  // Show bubble helper
  const showBubble = useCallback((text: string, duration = 3000) => {
    setBubbleText(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubbleText(null), duration);
  }, []);

  // Eye tracking — follow cursor with smooth lerp
  // Uses OS-level mouse position via Tauri event so it works even when
  // the window has set_ignore_cursor_events(true) for click-through.
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<[number, number]>("mouse_position", (event) => {
        if (!widgetRef.current) return;
        const rect = widgetRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // event.payload is (screenX, screenY) in logical pixels
        const screenX = event.payload[0];
        const screenY = event.payload[1];

        const dx = screenX - centerX;
        const dy = screenY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize to max offset of 6px
        const maxOffset = 6;
        const maxDistance = 500;
        const factor = Math.min(distance / maxDistance, 1);

        setEyeOffset({
          x: (dx / (distance || 1)) * maxOffset * factor,
          y: (dy / (distance || 1)) * maxOffset * factor,
        });
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [widgetRef]);

  // Follow mouse mode — pet follows cursor at set distance
  useEffect(() => {
    if (!followMouse || isDragging) return;

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<[number, number]>("mouse_position", (event) => {
        setFollowTarget({ x: event.payload[0], y: event.payload[1] });
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
      setFollowTarget(null);
    };
  }, [followMouse, isDragging]);

  // Expose controls via ref for external access
  useEffect(() => {
    if (widgetRef.current) {
      (widgetRef.current as any).__showBubble = showBubble;
      (widgetRef.current as any).__setState = applyState;
      (widgetRef.current as any).__profileName = profileName;
    }
  }, [showBubble, applyState, profileName]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  // Sync dragging state
  useEffect(() => {
    if (isDragging) {
      applyState("dragging");
    } else if (currentState === "dragging") {
      applyState("idle");
    }
  }, [isDragging, currentState, applyState]);

  // Listen for pet state events from the Rust backend
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<{ state: string; sub_state?: string }>("pet_state_event", (event) => {
        const state = event.payload.state.toLowerCase() as PetState;
        const subState = event.payload.sub_state as PetSubState | undefined;
        applyState(state, subState);
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [applyState]);

  const scale = getSizeScale();

  return (
    <div
      ref={widgetRef}
      className="floating-widget"
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        zIndex: 1000,
      }}
    >
      {/* Profile label */}
      <div className="pet-label">{profileName}</div>

      {/* Speech bubble */}
      {bubbleText && <div className="bubble">{bubbleText}</div>}

      {/* Character */}
      <div
        className={`pet-character ${isDragging ? "pet-dragging" : ""}`}
        onMouseDown={handleMouseDown}
        style={{ transform: `scaleX(${directionRef.current})` }}
      >
        <PetCharacter
          characterId={characterId}
          state={currentState}
          subState={currentSubState}
          direction={directionRef.current}
          eyeX={eyeOffset.x}
          eyeY={eyeOffset.y}
          animationName={currentAnimation}
        />
      </div>
    </div>
  );
}