import { useState, useEffect, useCallback, useRef } from "react";
import { usePetMovement } from "../hooks/usePetMovement";
import { usePetSystemStore } from "../store/petSystem";
import { CharacterRenderer } from "./characters/CharacterRenderer";
import type { PetName, PetState } from "../types/pet";

interface PetWidgetProps {
  petName: PetName;
  profileName: string;
  initialX: number;
  isSoundsEnabled: boolean;
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
function PetCharacter({
  characterId,
  state,
  direction,
  eyeX,
  eyeY,
}: {
  characterId: PetName;
  state: PetState;
  direction: number;
  eyeX: number;
  eyeY: number;
}) {
  const [displayState, setDisplayState] = useState(state);
  const [fading, setFading] = useState(false);
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state !== prevStateRef.current) {
      setFading(true);
      const timer = setTimeout(() => {
        setDisplayState(state);
        prevStateRef.current = state;
        setFading(false);
      }, 150); // Cross-fade duration
      return () => clearTimeout(timer);
    }
  }, [state]);

  const flip = direction < 0 ? "scale(-1, 1)" : "";

  return (
    <div
      className="pet-character-svg-wrapper"
      style={{
        opacity: fading ? 0.5 : 1,
        transition: "opacity 150ms ease-in-out",
        transform: flip,
      }}
    >
      <CharacterRenderer
        characterId={characterId}
        state={displayState}
        eyeX={eyeX}
        eyeY={eyeY}
      />
    </div>
  );
}

// ─── Main Pet Widget ─────────────────────────────────────────
export function PetWidget({ petName, profileName, initialX, isSoundsEnabled: _isSoundsEnabled }: PetWidgetProps) {
  const [followTarget, setFollowTarget] = useState<{ x: number; y: number } | null>(null);

  const characterId = usePetSystemStore((s) => s.getCharacterForProfile(profileName));
  const setPetState = usePetSystemStore((s) => s.setPetState);
  const followMouse = usePetSystemStore((s) => s.followMouse);
  const followDistance = usePetSystemStore((s) => s.followDistance);

  const { position, isDragging, directionRef, widgetRef, handleMouseDown, getSizeScale } =
    usePetMovement({ petName, size: "medium", initialX, followTarget, followDistance: followDistance });

  const [currentState, setCurrentState] = useState<PetState>("idle");
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyState = useCallback((newState: PetState) => {
    setCurrentState((prev) => {
      const resolved = resolveState(prev, newState);
      setPetState(profileName, resolved);
      return resolved;
    });
  }, [profileName, setPetState]);

  // Show bubble helper
  const showBubble = useCallback((text: string, duration = 3000) => {
    setBubbleText(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubbleText(null), duration);
  }, []);

  // Eye tracking — follow cursor with smooth lerp
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!widgetRef.current) return;
      const rect = widgetRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Normalize to max offset of 6px
      const maxOffset = 6;
      const maxDistance = 500;
      const factor = Math.min(distance / maxDistance, 1);

      setEyeOffset({
        x: (dx / (distance || 1)) * maxOffset * factor,
        y: (dy / (distance || 1)) * maxOffset * factor,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [widgetRef]);

  // Follow mouse mode — pet follows cursor at set distance
  useEffect(() => {
    if (!followMouse || isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setFollowTarget({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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

  const scale = getSizeScale();
  const animationClass = currentState === "idle" ? "idle-animation" : "";

  return (
    <div
      ref={widgetRef}
      className={`floating-widget ${animationClass}`}
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
          direction={directionRef.current}
          eyeX={eyeOffset.x}
          eyeY={eyeOffset.y}
        />
      </div>
    </div>
  );
}
