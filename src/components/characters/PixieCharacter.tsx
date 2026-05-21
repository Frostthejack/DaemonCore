/**
 * Pixie character — abstract fairy dust / glowing sparkle cloud
 * Ethereal, magical, abstract. A cloud of light and sparkles.
 */
import type { PetSubState } from "../../types/pet";

export function PixieSVG({ state, subState: _subState }: { state: string; subState?: PetSubState }) {
  const baseHue = state === "working" ? 120 : state === "error" ? 0 : state === "notification" ? 320 : state === "sleeping" ? 260 : 45;
  const glowColor = `hsl(${baseHue}, 100%, 70%)`;
  const coreColor = `hsl(${baseHue}, 100%, 85%)`;

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pixie-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pixie-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <radialGradient id={`pixie-core-${state}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={coreColor} stopOpacity="0.9" />
          <stop offset="40%" stopColor={glowColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer glow cloud */}
      <circle cx="100" cy="100" r="60" fill={`url(#pixie-core-${state})`} filter="url(#pixie-soft)">
        <animate attributeName="r" values="55;65;55" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Dust cloud blobs */}
      <g filter="url(#pixie-soft)" opacity="0.6">
        <ellipse cx="80" cy="85" rx="25" ry="20" fill={glowColor}>
          <animate attributeName="rx" values="22;28;22" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="ry" values="18;24;18" dur="2.8s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="120" cy="90" rx="22" ry="18" fill={glowColor}>
          <animate attributeName="rx" values="20;26;20" dur="2.2s" repeatCount="indefinite" begin="0.3s" />
          <animate attributeName="ry" values="16;22;16" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
        </ellipse>
        <ellipse cx="100" cy="110" rx="30" ry="22" fill={glowColor}>
          <animate attributeName="rx" values="28;34;28" dur="3s" repeatCount="indefinite" begin="0.5s" />
          <animate attributeName="ry" values="20;26;20" dur="2.7s" repeatCount="indefinite" begin="0.5s" />
        </ellipse>
        <ellipse cx="90" cy="100" rx="20" ry="25" fill={glowColor}>
          <animate attributeName="rx" values="18;24;18" dur="2.8s" repeatCount="indefinite" begin="0.2s" />
        </ellipse>
        <ellipse cx="115" cy="105" rx="18" ry="15" fill={glowColor}>
          <animate attributeName="ry" values="13;19;13" dur="2.4s" repeatCount="indefinite" begin="0.7s" />
        </ellipse>
      </g>

      {/* Sparkles */}
      <g filter="url(#pixie-glow)">
        {/* Large sparkles */}
        <g opacity="0.9">
          <polygon points="100,50 103,58 111,58 105,63 107,71 100,66 93,71 95,63 89,58 97,58" fill="white">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="rotate" values="0 100 60;360 100 60" dur="8s" repeatCount="indefinite" />
          </polygon>
        </g>

        <g opacity="0.7">
          <polygon points="60,70 62,75 67,75 63,78 64,83 60,80 56,83 57,78 53,75 58,75" fill="white">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" begin="0.3s" />
            <animateTransform attributeName="transform" type="rotate" values="0 60;360 60" dur="6s" repeatCount="indefinite" />
          </polygon>
        </g>

        <g opacity="0.8">
          <polygon points="140,65 142,70 147,70 143,73 144,78 140,75 136,78 137,73 133,70 138,70" fill="white">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" begin="0.6s" />
            <animateTransform attributeName="transform" type="rotate" values="0 140;360 140" dur="7s" repeatCount="indefinite" />
          </polygon>
        </g>

        {/* Small floating sparkles */}
        <circle cx="70" cy="120" r="2" fill="white" opacity="0.6">
          <animate attributeName="cy" values="120;100;120" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="130" cy="115" r="2.5" fill="white" opacity="0.5">
          <animate attributeName="cy" values="115;95;115" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
          <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        <circle cx="85" cy="140" r="1.5" fill="white" opacity="0.7">
          <animate attributeName="cy" values="140;125;140" dur="2.8s" repeatCount="indefinite" begin="1s" />
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.8s" repeatCount="indefinite" begin="1s" />
        </circle>
        <circle cx="115" cy="135" r="2" fill="white" opacity="0.6">
          <animate attributeName="cy" values="135;118;135" dur="3.2s" repeatCount="indefinite" begin="0.3s" />
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.2s" repeatCount="indefinite" begin="0.3s" />
        </circle>
        <circle cx="100" cy="145" r="1.5" fill="white" opacity="0.5">
          <animate attributeName="cy" values="145;130;145" dur="2.2s" repeatCount="indefinite" begin="0.8s" />
          <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.2s" repeatCount="indefinite" begin="0.8s" />
        </circle>

        {/* Tiny distant sparkles */}
        <circle cx="55" cy="95" r="1" fill={glowColor} opacity="0.4">
          <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="145" cy="85" r="1" fill={glowColor} opacity="0.3">
          <animate attributeName="opacity" values="0;0.5;0" dur="2.5s" repeatCount="indefinite" begin="0.7s" />
        </circle>
        <circle cx="75" cy="60" r="1.2" fill={glowColor} opacity="0.5">
          <animate attributeName="opacity" values="0;0.7;0" dur="1.8s" repeatCount="indefinite" begin="1.2s" />
        </circle>
        <circle cx="125" cy="140" r="1" fill={glowColor} opacity="0.4">
          <animate attributeName="opacity" values="0;0.6;0" dur="2.2s" repeatCount="indefinite" begin="0.4s" />
        </circle>
      </g>

      {/* Core bright spot */}
      <circle cx="100" cy="95" r="8" fill="white" opacity="0.8" filter="url(#pixie-glow)">
        <animate attributeName="r" values="7;10;7" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Eyes (subtle, embedded in the glow) */}
      {state !== "sleeping" ? (
        <g opacity="0.7">
          <circle cx="90" cy="92" r="4" fill="white" />
          <circle cx="110" cy="92" r="4" fill="white" />
          <circle cx="90" cy="92" r="2" fill="#2C1810" />
          <circle cx="110" cy="92" r="2" fill="#2C1810" />
        </g>
      ) : (
        <g opacity="0.5">
          <path d="M84 92 Q90 96 96 92" stroke="#2C1810" strokeWidth="1.5" fill="none" />
          <path d="M104 92 Q110 96 116 92" stroke="#2C1810" strokeWidth="1.5" fill="none" />
          <text x="125" y="75" fontSize="12" fill={glowColor} opacity="0.5">Z</text>
          <text x="138" y="62" fontSize="16" fill={glowColor} opacity="0.3">
            Z
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
          </text>
        </g>
      )}

      {/* State-specific effects */}
      {state === "thinking" && (
        <g>
          <circle cx="100" cy="55" r="3" fill="white" opacity="0.5">
            <animate attributeName="cy" values="55;40;55" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="92" cy="50" r="2" fill="white" opacity="0.4">
            <animate attributeName="cy" values="50;33;50" dur="2.3s" repeatCount="indefinite" begin="0.4s" />
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.3s" repeatCount="indefinite" begin="0.4s" />
          </circle>
          <circle cx="108" cy="48" r="2.5" fill="white" opacity="0.3">
            <animate attributeName="cy" values="48;30;48" dur="1.9s" repeatCount="indefinite" begin="0.8s" />
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.9s" repeatCount="indefinite" begin="0.8s" />
          </circle>
        </g>
      )}

      {state === "done" && (
        <g>
          <polygon points="100,45 102,51 108,51 103,55 105,61 100,57 95,61 97,55 92,51 98,51" fill="#FFD700" filter="url(#pixie-glow)">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
          </polygon>
        </g>
      )}

      {state === "error" && (
        <g>
          <text x="130" y="60" fontSize="24" fill="#FF4444" filter="url(#pixie-glow)">
            !
            <animateTransform attributeName="transform" type="translate" values="0,0;-2,0;2,0;0,0" dur="0.3s" repeatCount="indefinite" />
          </text>
        </g>
      )}
    </svg>
  );
}
