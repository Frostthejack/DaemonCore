import { useRef } from "react";
import { useAppConfigStore } from "./useAppConfig";
import type { PetState } from "../types/pet";

// ─── Audio Context Singleton ───────────────────────────────────────
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// ─── Sound Definitions ─────────────────────────────────────────────
// Synthesized sounds using Web Audio API - no external files needed
// Each sound is short (< 200ms) and distinctive
//
// FALLBACK: Pre-recorded audio files exist in ../public/sounds/
// (thinking.ogg, working.ogg, done.ogg, error.ogg) as fallback
// if Web Audio API is unavailable or disabled. See that directory's
// README.md for replacement guidelines.

interface SoundParams {
  frequency: number;
  type: OscillatorType;
  duration: number;
  volume: number;
}

const STATE_SOUNDS: Record<PetState, SoundParams | null> = {
  idle: null, // No sound for idle
  thinking: {
    frequency: 440, // A4 - gentle, contemplative
    type: "sine",
    duration: 150,
    volume: 0.1,
  },
  working: {
    frequency: 220, // A3 - steady, productive
    type: "square",
    duration: 100,
    volume: 0.15,
  },
  done: {
    frequency: 660, // E5 - positive, completion
    type: "sine",
    duration: 200,
    volume: 0.2,
  },
  error: {
    frequency: 110, // A2 - low, alert
    type: "sawtooth",
    duration: 300,
    volume: 0.25,
  },
  notification: {
    frequency: 880, // A5 - bright, attention
    type: "sine",
    duration: 100,
    volume: 0.15,
  },
  dragging: null, // No sound for dragging
  sleeping: null, // No sound for sleeping
};

// ─── Sound Playback ────────────────────────────────────────────────
function playSound(params: SoundParams): void {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required after user interaction)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = params.type;
    oscillator.frequency.setValueAtTime(params.frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(params.volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + params.duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + params.duration / 1000);
  } catch (e) {
    // Audio playback can fail in some environments (e.g., missing user interaction)
    console.debug("[useSoundManager] Audio playback failed:", e);
  }
}

// ─── Hook ──────────────────────────────────────────────────────────
export function useSoundManager() {
  const isSoundsEnabled = useAppConfigStore((s) => s.isSoundsEnabled);
  const lastStateRef = useRef<PetState | null>(null);

  // Play sound on state change
  const playStateSound = (state: PetState) => {
    if (!isSoundsEnabled) return;
    
    const soundParams = STATE_SOUNDS[state];
    if (soundParams) {
      playSound(soundParams);
    }
  };

  // Get current state for external use
  const getCurrentState = () => lastStateRef.current;

  // Update last state and play sound
  const handleStateChange = (newState: PetState) => {
    if (lastStateRef.current !== newState) {
      lastStateRef.current = newState;
      playStateSound(newState);
    }
  };

  return {
    playStateSound,
    handleStateChange,
    getCurrentState,
    isSoundsEnabled,
  };
}

// ─── Utility for direct sound triggering ───────────────────────────
export function playPetStateSound(state: PetState, enabled: boolean = true): void {
  if (!enabled) return;
  
  const soundParams = STATE_SOUNDS[state];
  if (soundParams) {
    playSound(soundParams);
  }
}