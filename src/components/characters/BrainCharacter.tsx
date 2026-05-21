/**
 * Brain character — abstract glowing neural network
 * Pulsing pink brain with connecting neural lines
 */
import type { PetSubState } from "../../types/pet";

export function BrainSVG({ state, subState: _subState }: { state: string; subState?: PetSubState }) {
  const pulseColor = state === "thinking" ? "#FF69B4" : state === "working" ? "#00FF88" : "#FF69B4";
  const glowIntensity = state === "thinking" ? "0.9" : state === "working" ? "0.8" : "0.5";

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`brain-glow-${state}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={pulseColor} stopOpacity={glowIntensity} />
          <stop offset="60%" stopColor="#CC4488" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#882266" stopOpacity="0.3" />
        </radialGradient>
        <filter id="brain-blur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="brain-outer-glow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow */}
      <circle cx="100" cy="100" r="70" fill={`url(#brain-glow-${state})`} filter="url(#brain-blur)">
        <animate attributeName="r" values="68;72;68" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Neural network lines */}
      <g stroke={pulseColor} strokeWidth="1.5" opacity="0.6" filter="url(#brain-outer-glow)">
        <line x1="70" y1="70" x2="100" y2="60">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
        </line>
        <line x1="100" y1="60" x2="130" y2="70">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.2s" />
        </line>
        <line x1="70" y1="70" x2="60" y2="100">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
        </line>
        <line x1="130" y1="70" x2="140" y2="100">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
        </line>
        <line x1="60" y1="100" x2="75" y2="130">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
        </line>
        <line x1="140" y1="100" x2="125" y2="130">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
        </line>
        <line x1="75" y1="130" x2="100" y2="140">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.7s" />
        </line>
        <line x1="125" y1="130" x2="100" y2="140">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.1s" />
        </line>
        <line x1="100" y1="60" x2="100" y2="100">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.8s" />
        </line>
        <line x1="70" y1="70" x2="130" y2="70">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" begin="0.9s" />
        </line>
      </g>

      {/* Brain shape — left hemisphere */}
      <path
        d="M100 55 C75 55 55 70 55 95 C55 115 65 130 80 138 C85 140 90 135 90 128 C90 120 85 115 80 110 C72 104 68 95 72 85 C76 75 88 68 100 68 Z"
        fill={`url(#brain-glow-${state})`}
        filter="url(#brain-outer-glow)"
      >
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Brain shape — right hemisphere */}
      <path
        d="M100 55 C125 55 145 70 145 95 C145 115 135 130 120 138 C115 140 110 135 110 128 C110 120 115 115 120 110 C128 104 132 95 128 85 C124 75 112 68 100 68 Z"
        fill={`url(#brain-glow-${state})`}
        filter="url(#brain-outer-glow)"
      >
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" begin="0.3s" />
      </path>

      {/* Neural nodes */}
      <g fill={pulseColor} filter="url(#brain-outer-glow)">
        <circle cx="100" cy="60" r="4">
          <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="70" cy="70" r="3">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" begin="0.2s" />
        </circle>
        <circle cx="130" cy="70" r="3">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" begin="0.4s" />
        </circle>
        <circle cx="60" cy="100" r="3">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
        </circle>
        <circle cx="140" cy="100" r="3">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
        </circle>
        <circle cx="75" cy="130" r="3">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        <circle cx="125" cy="130" r="3">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" begin="0.7s" />
        </circle>
        <circle cx="100" cy="100" r="5">
          <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" begin="0.1s" />
        </circle>
      </g>

      {/* Eyes */}
      {state !== "sleeping" ? (
        <g>
          <circle cx="88" cy="90" r="6" fill="white" opacity="0.9" />
          <circle cx="112" cy="90" r="6" fill="white" opacity="0.9" />
          <circle cx="88" cy="90" r="3" fill="#2C1810" />
          <circle cx="112" cy="90" r="3" fill="#2C1810" />
          <circle cx="86" cy="88" r="1.5" fill="white" opacity="0.8" />
          <circle cx="110" cy="88" r="1.5" fill="white" opacity="0.8" />
        </g>
      ) : (
        <g>
          <path d="M82 90 Q88 95 94 90" stroke="#2C1810" strokeWidth="2" fill="none" />
          <path d="M106 90 Q112 95 118 90" stroke="#2C1810" strokeWidth="2" fill="none" />
        </g>
      )}

      {/* State overlays */}
      {state === "thinking" && (
        <g>
          <circle cx="100" cy="40" r="4" fill={pulseColor} opacity="0.6">
            <animate attributeName="cy" values="40;25;40" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="90" cy="35" r="3" fill={pulseColor} opacity="0.4">
            <animate attributeName="cy" values="35;18;35" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
          </circle>
          <circle cx="110" cy="38" r="3" fill={pulseColor} opacity="0.5">
            <animate attributeName="cy" values="38;20;38" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
          </circle>
        </g>
      )}

      {state === "sleeping" && (
        <g>
          <text x="130" y="50" fontSize="14" fill={pulseColor} opacity="0.6">Z</text>
          <text x="145" y="35" fontSize="18" fill={pulseColor} opacity="0.4">
            Z
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
          </text>
        </g>
      )}
    </svg>
  );
}
