import { useState, useEffect, useCallback, useRef } from "react";
import { usePetMovement } from "../hooks/usePetMovement";
import type { PetName, PetState } from "../types/pet";

interface PetWidgetProps {
  petName: PetName;
  initialX: number;
  isSoundsEnabled: boolean;
}

// SVG pet renderer using external image files
function PetSVG({ state, direction }: { state: PetState; direction: number }) {
  const flip = direction < 0 ? "scale(-1, 1)" : "";

  const statePaths: Record<PetState, string> = {
    idle: "/pet-states/idle.svg",
    thinking: "/pet-states/thinking.svg",
    working: "/pet-states/working.svg",
    done: "/pet-states/done.svg",
    error: "/pet-states/error.svg",
    notification: "/pet-states/notification.svg",
    dragging: "/pet-states/dragging.svg",
    sleeping: "/pet-states/sleeping.svg",
  };

  const src = statePaths[state] || statePaths.idle;

  return (
    <img
      src={src}
      alt={`pet-${state}`}
      className="pet-svg"
      style={{ transform: flip }}
      draggable="false"
    />
  );
}

export function PetWidget({ petName, initialX, isSoundsEnabled: _isSoundsEnabled }: PetWidgetProps) {
  const { position, isDragging, directionRef, widgetRef, handleMouseDown, getSizeScale } =
    usePetMovement({ petName, size: "medium", initialX });

  const [currentState, setCurrentState] = useState<PetState>("idle");
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show bubble helper (used by Hermes integration later)
  const showBubble = useCallback((text: string, duration = 3000) => {
    setBubbleText(text);
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubbleText(null), duration);
  }, []);

  // Expose showBubble and setCurrentState via ref for external control
  useEffect(() => {
    if (widgetRef.current) {
      (widgetRef.current as any).__showBubble = showBubble;
      (widgetRef.current as any).__setState = setCurrentState;
    }
  }, [showBubble]);

  // Cleanup bubble timer
  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

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
      {bubbleText && <div className="bubble">{bubbleText}</div>}
      <div
        className={`pet-character ${isDragging ? "pet-dragging" : ""}`}
        onMouseDown={handleMouseDown}
        style={{ transform: `scaleX(${directionRef.current})` }}
      >
        <PetSVG
          state={currentState}
          direction={directionRef.current}
        />
      </div>
    </div>
  );
}
