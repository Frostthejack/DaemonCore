import { useState, useEffect, useRef, useCallback } from "react";
import type { PetName, PetSize } from "../types/pet";

interface UsePetMovementArgs {
  petName: PetName;
  size: PetSize;
  initialX: number;
}

export function usePetMovement({ petName: _petName, size, initialX }: UsePetMovementArgs) {
  const [position, setPosition] = useState({ x: initialX, y: window.innerHeight - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const directionRef = useRef(1);
  const startPosRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      startPosRef.current = { x: e.clientX, y: e.clientY };
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [position]
  );

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUpGlobal = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMoveGlobal);
      window.addEventListener("mouseup", handleMouseUpGlobal);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMoveGlobal);
      window.removeEventListener("mouseup", handleMouseUpGlobal);
    };
  }, [isDragging, dragOffset]);

  const getSizeScale = () => {
    switch (size) {
      case "small": return 0.7;
      case "large": return 1.5;
      case "medium":
      default: return 1;
    }
  };

  return {
    position,
    setPosition,
    isDragging,
    directionRef,
    widgetRef,
    handleMouseDown,
    getSizeScale,
  };
}
