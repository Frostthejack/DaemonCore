import { useState, useEffect, useCallback, useRef } from "react";
import { usePetMovement } from "../hooks/usePetMovement";
import type { PetName, PetState } from "../types/pet";

interface PetWidgetProps {
  petName: PetName;
  initialX: number;
  isSoundsEnabled: boolean;
}

// Simple SVG pet renderer
function PetSVG({ state, direction }: { state: PetState; direction: number }) {
  const flip = direction < 0 ? "scale(-1, 1)" : "";

  const stateColors: Record<PetState, string> = {
    idle: "#7c6df0",
    thinking: "#f0a030",
    working: "#30a0f0",
    done: "#30d080",
    error: "#f03040",
    notification: "#f0d030",
    dragging: "#c070f0",
    sleeping: "#8080a0",
  };

  const bg = stateColors[state] || "#7c6df0";

  return (
    <svg
      className="pet-svg"
      viewBox="0 0 150 150"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: flip }}
    >
      {/* Body */}
      <ellipse cx="75" cy="90" rx="45" ry="40" fill={bg} opacity="0.9" />
      {/* Head */}
      <circle cx="75" cy="55" r="35" fill={bg} />
      {/* Left eye */}
      <circle cx="62" cy="50" r="10" fill="white" />
      <circle cx="64" cy="50" r="5" fill="#222" />
      {/* Right eye */}
      <circle cx="88" cy="50" r="10" fill="white" />
      <circle cx="90" cy="50" r="5" fill="#222" />
      {/* Beak */}
      <polygon points="75,58 70,68 80,68" fill="#f0a030" />
      {/* Wings */}
      <ellipse cx="35" cy="85" rx="12" ry="20" fill={bg} opacity="0.7" />
      <ellipse cx="115" cy="85" rx="12" ry="20" fill={bg} opacity="0.7" />
      {/* Feet */}
      <ellipse cx="60" cy="128" rx="10" ry="5" fill="#f0a030" />
      <ellipse cx="90" cy="128" rx="10" ry="5" fill="#f0a030" />
      {/* State indicators */}
      {state === "thinking" && (
        <>
          <circle cx="105" cy="30" r="4" fill="#fff" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="115" cy="22" r="6" fill="#fff" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
          </circle>
          <circle cx="125" cy="15" r="8" fill="#fff" opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
          </circle>
        </>
      )}
      {state === "working" && (
        <g>
          <rect x="55" y="100" width="40" height="25" rx="4" fill="#fff" opacity="0.9" />
          <rect x="60" y="105" width="20" height="3" rx="1" fill="#333">
            <animate attributeName="width" values="5;30;5" dur="1s" repeatCount="indefinite" />
          </rect>
          <rect x="60" y="112" width="25" height="3" rx="1" fill="#333">
            <animate attributeName="width" values="10;35;10" dur="1.2s" repeatCount="indefinite" />
          </rect>
          <rect x="60" y="119" width="15" height="3" rx="1" fill="#333">
            <animate attributeName="width" values="8;25;8" dur="0.8s" repeatCount="indefinite" />
          </rect>
        </g>
      )}
      {state === "done" && (
        <path d="M55 70 L70 85 L95 55" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="0.5s" fill="freeze" />
        </path>
      )}
      {state === "error" && (
        <text x="65" y="75" fontSize="30" fill="#fff" fontWeight="bold">!</text>
      )}
      {state === "sleeping" && (
        <>
          <line x1="55" y1="50" x2="70" y2="50" stroke="#222" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="50" x2="95" y2="50" stroke="#222" strokeWidth="3" strokeLinecap="round" />
          <text x="100" y="25" fontSize="14" fill="#fff" opacity="0.7">Z</text>
          <text x="112" y="18" fontSize="10" fill="#fff" opacity="0.5">z</text>
          <text x="120" y="12" fontSize="8" fill="#fff" opacity="0.3">z</text>
        </>
      )}
    </svg>
  );
}

export function PetWidget({ petName, initialX, isSoundsEnabled: _isSoundsEnabled }: PetWidgetProps) {
  const { position, setPosition, isDragging, directionRef, widgetRef, handleMouseDown, getSizeScale } =
    usePetMovement({ petName, size: "medium", initialX });

  const [currentState, setCurrentState] = useState<PetState>("idle");
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simple wandering behavior
  useEffect(() => {
    if (isDragging || currentState === "sleeping") return;

    const interval = setInterval(() => {
      setPosition((prev: { x: number; y: number }) => {
        const moveAmount = (Math.random() - 0.5) * 20;
        const newX = prev.x + moveAmount;
        if (moveAmount > 0) directionRef.current = 1;
        else if (moveAmount < 0) directionRef.current = -1;
        return {
          x: Math.max(0, Math.min(window.innerWidth - 150, newX)),
          y: prev.y,
        };
      });
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [isDragging, currentState, directionRef, setPosition]);

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
        <PetSVG state={currentState} direction={directionRef.current} />
      </div>
    </div>
  );
}
