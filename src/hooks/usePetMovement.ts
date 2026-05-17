import { useState, useEffect, useRef, useCallback } from "react";
import type { PetName, PetSize } from "../types/pet";

interface UsePetMovementArgs {
  petName: PetName;
  size: PetSize;
  initialX: number;
}

interface WanderState {
  targetX: number;
  targetY: number;
  isMoving: boolean;
  pauseTimer: ReturnType<typeof setTimeout> | null;
  speed: number;
}

export function usePetMovement({ petName: _petName, size, initialX }: UsePetMovementArgs) {
  const [position, setPosition] = useState({ x: initialX, y: window.innerHeight - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const directionRef = useRef(1);
  const startPosRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const wanderRef = useRef<WanderState>({
    targetX: initialX,
    targetY: window.innerHeight - 200,
    isMoving: false,
    pauseTimer: null,
    speed: 50,
  });
  const positionRef = useRef(position);
  positionRef.current = position;

  const getSizeScale = () => {
    switch (size) {
      case "small": return 0.7;
      case "large": return 1.5;
      case "medium":
      default: return 1;
    }
  };

  // Pick a random destination within screen bounds (150px from edges)
  const pickDestination = useCallback(() => {
    const padding = 150;
    const maxX = window.innerWidth - padding;
    const maxY = window.innerHeight - padding;
    const targetX = padding + Math.random() * (maxX - padding);
    const targetY = padding + Math.random() * (maxY - padding);
    wanderRef.current.targetX = targetX;
    wanderRef.current.targetY = targetY;
    wanderRef.current.isMoving = true;
  }, []);

  // Easing function for smooth movement
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Animation loop using requestAnimationFrame
  const animate = useCallback(() => {
    const wander = wanderRef.current;
    const pos = positionRef.current;

    if (wander.isMoving) {
      const dx = wander.targetX - pos.x;
      const dy = wander.targetY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if reached destination
      if (distance < 5) {
        wander.isMoving = false;
        // Pause 2-5 seconds before picking new destination
        const pauseDuration = 2000 + Math.random() * 3000;
        wander.pauseTimer = setTimeout(() => {
          pickDestination();
        }, pauseDuration);
        return;
      }

      // Move toward target with easing
      const speed = wander.speed; // ~50px/s
      const dt = 1 / 60; // 60fps
      const moveDistance = speed * dt;
      const progress = Math.min(moveDistance / distance, 1);
      const easedProgress = easeInOutCubic(progress);

      const newX = pos.x + dx * easedProgress;
      const newY = pos.y + dy * easedProgress;

      // Update direction based on movement
      if (dx > 1) directionRef.current = 1;
      else if (dx < -1) directionRef.current = -1;

      setPosition({ x: newX, y: newY });
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [pickDestination]);

  // Start animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (wanderRef.current.pauseTimer) clearTimeout(wanderRef.current.pauseTimer);
    };
  }, [animate]);

  // Pick initial destination
  useEffect(() => {
    pickDestination();
  }, [pickDestination]);

  // Stop wandering when dragging
  useEffect(() => {
    if (isDragging) {
      wanderRef.current.isMoving = false;
      if (wanderRef.current.pauseTimer) {
        clearTimeout(wanderRef.current.pauseTimer);
        wanderRef.current.pauseTimer = null;
      }
    } else if (!wanderRef.current.isMoving && !wanderRef.current.pauseTimer) {
      // Resume wandering after drag ends
      pickDestination();
    }
  }, [isDragging, pickDestination]);

  // Handle external state changes (sleeping, notification, etc.)
  // These should be handled by the caller via a ref or state sync
  const handleStateChange = useCallback((state: string) => {
    if (state === "sleeping" || state === "notification") {
      wanderRef.current.isMoving = false;
      if (wanderRef.current.pauseTimer) {
        clearTimeout(wanderRef.current.pauseTimer);
        wanderRef.current.pauseTimer = null;
      }
    } else if (state === "idle") {
      if (!wanderRef.current.isMoving && !wanderRef.current.pauseTimer) {
        pickDestination();
      }
    }
  }, [pickDestination]);

  // Expose handleStateChange via widget ref
  useEffect(() => {
    if (widgetRef.current) {
      (widgetRef.current as any).__handleStateChange = handleStateChange;
    }
  }, [handleStateChange]);

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

  return {
    position,
    setPosition,
    isDragging,
    directionRef,
    widgetRef,
    handleMouseDown,
    getSizeScale,
    handleStateChange,
  };
}
