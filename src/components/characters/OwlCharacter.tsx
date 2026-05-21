/**
 * Owl character — detailed cartoon style
 * Expressive eyes with cursor-following, feather details, ear tufts
 */
import type { PetSubState } from "../../types/pet";

export function OwlSVG({ state, subState, eyeX = 0, eyeY = 0 }: { state: string; subState?: PetSubState; eyeX?: number; eyeY?: number }) {
  // Clamp eye offset
  const ex = Math.max(-6, Math.min(6, eyeX));
  const ey = Math.max(-4, Math.min(4, eyeY));

  const stateColors: Record<string, { body: string; belly: string; accent: string }> = {
    idle: { body: "#6B5B95", belly: "#9B8AC4", accent: "#FFD700" },
    thinking: { body: "#6B5B95", belly: "#9B8AC4", accent: "#87CEEB" },
    working: { body: "#5B7D6F", belly: "#8AB8A0", accent: "#32CD32" },
    done: { body: "#6B5B95", belly: "#9B8AC4", accent: "#FFD700" },
    error: { body: "#9B4A4A", belly: "#C47A7A", accent: "#FF4444" },
    notification: { body: "#6B5B95", belly: "#9B8AC4", accent: "#FF69B4" },
    dragging: { body: "#7B6B85", belly: "#A89BB8", accent: "#DDA0DD" },
    sleeping: { body: "#4A4A6A", belly: "#6A6A8A", accent: "#9370DB" },
  };

  const colors = stateColors[state] || stateColors.idle;

  // Sub-state specific colors and animations
  const subStateColors: Record<string, { body: string; belly: string; accent: string }> = {
    terminal_work: { body: "#2D3748", belly: "#4A5568", accent: "#00FF41" },  // Dark terminal green
    code_work: { body: "#1A202C", belly: "#2D3748", accent: "#63B3ED" },  // Dark blue
    searching: { body: "#553C9A", belly: "#7B61FF", accent: "#F6AD55" },  // Purple/orange
    analyzing: { body: "#553C9A", belly: "#7B61FF", accent: "#63B3ED" },  // Purple/blue
    curious: { body: "#D69E2E", belly: "#F6AD55", accent: "#ECC94B" },  // Gold/orange
    excited: { body: "#C02942", belly: "#E74C3C", accent: "#F1C40F" },  // Red/gold
    surprised: { body: "#9F7AEA", belly: "#B794F6", accent: "#ED64A6" },  // Purple/pink
  };

  // Use sub-state colors if available, otherwise fall back to state colors
  const activeColors = subState && subStateColors[subState] ? subStateColors[subState] : colors;

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`owl-body-${state}-${subState || "base"}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={activeColors.belly} />
          <stop offset="100%" stopColor={activeColors.body} />
        </radialGradient>
        <radialGradient id={`owl-eye-${state}-${subState || "base"}`} cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="80%" stopColor="#F0F0F0" />
          <stop offset="100%" stopColor="#E0E0E0" />
        </radialGradient>
        <filter id="owl-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Ear tufts */}
      <path d="M60 55 L45 20 L75 45" fill={activeColors.body} />
      <path d="M140 55 L155 20 L125 45" fill={activeColors.body} />
      <path d="M65 50 L55 28 L78 47" fill={activeColors.belly} opacity="0.5" />
      <path d="M135 50 L145 28 L122 47" fill={activeColors.belly} opacity="0.5" />

      {/* Body */}
      <ellipse cx="100" cy="120" rx="55" ry="60" fill={`url(#owl-body-${state}-${subState || "base"})`} filter="url(#owl-shadow)" />

      {/* Belly feathers */}
      <ellipse cx="100" cy="130" rx="35" ry="40" fill={activeColors.belly} opacity="0.4" />
      <path d="M80 115 Q100 125 120 115" stroke={activeColors.body} strokeWidth="1" fill="none" opacity="0.3" />
      <path d="M75 130 Q100 142 125 130" stroke={activeColors.body} strokeWidth="1" fill="none" opacity="0.3" />
      <path d="M78 145 Q100 158 122 145" stroke={activeColors.body} strokeWidth="1" fill="none" opacity="0.3" />

      {/* Wings */}
      <ellipse cx="50" cy="115" rx="15" ry="35" fill={activeColors.body} opacity="0.7" />
      <ellipse cx="150" cy="115" rx="15" ry="35" fill={activeColors.body} opacity="0.7" />

      {/* Head */}
      <circle cx="100" cy="70" r="40" fill={`url(#owl-body-${state}-${subState || "base"})`} />

      {/* Eye whites */}
      <circle cx="82" cy="65" r="18" fill={`url(#owl-eye-${state}-${subState || "base"})`} />
      <circle cx="118" cy="65" r="18" fill={`url(#owl-eye-${state}-${subState || "base"})`} />

      {/* Pupils — cursor tracking */}
      <circle cx={82 + ex} cy={65 + ey} r="9" fill="#2C1810" />
      <circle cx={118 + ex} cy={65 + ey} r="9" fill="#2C1810" />

      {/* Eye highlights */}
      <circle cx={79 + ex * 0.5} cy={62 + ey * 0.5} r="3" fill="white" opacity="0.8" />
      <circle cx={115 + ex * 0.5} cy={62 + ey * 0.5} r="3" fill="white" opacity="0.8" />

      {/* Beak */}
      <path d="M93 78 L100 92 L107 78" fill={activeColors.accent} />

      {/* Talons */}
      <path d="M75 175 L70 188 L75 185 L80 188 L75 175" fill={activeColors.accent} />
      <path d="M125 175 L120 188 L125 185 L130 188 L125 175" fill={activeColors.accent} />

      {/* State-specific overlays */}
      {state === "thinking" && (
        <g className="thinking-bubbles">
          <circle cx="145" cy="35" r="5" fill="none" stroke="#87CEEB" strokeWidth="1.5" opacity="0.7">
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="155" cy="22" r="8" fill="none" stroke="#87CEEB" strokeWidth="1.5" opacity="0.5">
            <animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" begin="0.3s" />
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </circle>
          <circle cx="165" cy="8" r="10" fill="none" stroke="#87CEEB" strokeWidth="1" opacity="0.3">
            <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" begin="0.6s" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" begin="0.6s" />
          </circle>
        </g>
      )}

      {state === "working" && (
        <g>
          <rect x="60" y="145" width="80" height="50" rx="5" fill="#333" opacity="0.8" />
          <rect x="65" y="150" width="70" height="35" rx="2" fill="#1a1a2e" />
          <rect x="70" y="155" width="40" height="3" rx="1" fill="#00ff41" opacity="0.8">
            <animate attributeName="width" values="0;40" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect x="70" y="162" width="30" height="3" rx="1" fill="#00ff41" opacity="0.6">
            <animate attributeName="width" values="0;30" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </rect>
          <rect x="70" y="169" width="35" height="3" rx="1" fill="#00ff41" opacity="0.7">
            <animate attributeName="width" values="0;35" dur="1.8s" repeatCount="indefinite" begin="0.6s" />
          </rect>
        </g>
      )}

      {state === "done" && (
        <g>
          <text x="155" y="40" fontSize="30" fill="#FFD700">
            ✓
            <animateTransform attributeName="transform" type="scale" values="0.8;1.2;0.8" dur="1s" repeatCount="indefinite" />
          </text>
          <circle cx="140" cy="50" r="3" fill="#FFD700" opacity="0.8">
            <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="170" cy="30" r="2" fill="#FFD700" opacity="0.6">
            <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" begin="0.5s" />
          </circle>
        </g>
      )}

      {state === "error" && (
        <g>
          <text x="145" y="35" fontSize="28" fill="#FF4444">
            !
            <animateTransform attributeName="transform" type="translate" values="0,0;-3,0;3,0;0,0" dur="0.3s" repeatCount="indefinite" />
          </text>
          <path d="M75 95 Q80 90 85 95 Q90 90 95 95" stroke="#FF4444" strokeWidth="2" fill="none" />
        </g>
      )}

      {state === "notification" && (
        <g>
          <circle cx="155" cy="30" r="15" fill="#FF69B4" opacity="0.8">
            <animate attributeName="r" values="12;16;12" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x="150" y="36" fontSize="16" fill="white" fontWeight="bold">!</text>
        </g>
      )}

      {state === "sleeping" && (
        <g className="sleeping-zzz">
          <text x="140" y="30" fontSize="14" fill="#9370DB" opacity="0.8">Z</text>
          <text x="155" y="18" fontSize="18" fill="#9370DB" opacity="0.6">
            Z
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
          </text>
          <text x="170" y="8" fontSize="22" fill="#9370DB" opacity="0.4">
            Z
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" begin="0.5s" />
          </text>
          {/* Closed eyes */}
          <path d="M70 65 Q82 72 94 65" stroke="#2C1810" strokeWidth="2.5" fill="none" />
          <path d="M106 65 Q118 72 130 65" stroke="#2C1810" strokeWidth="2.5" fill="none" />
        </g>
      )}

      {state === "dragging" && (
        <g>
          <path d="M30 100 L20 95" stroke="#DDA0DD" strokeWidth="2" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M30 110 L18 108" stroke="#DDA0DD" strokeWidth="2" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.2s" />
          </path>
          <path d="M170 100 L180 95" stroke="#DDA0DD" strokeWidth="2" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.5s" repeatCount="indefinite" begin="0.1s" />
          </path>
          <path d="M170 110 L182 108" stroke="#DDA0DD" strokeWidth="2" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.3s" />
          </path>
        </g>
      )}

      {/* Sub-state specific overlays */}
      {subState === "terminal_work" && (
        <g className="terminal-work-overlay">
          <rect x="55" y="140" width="90" height="55" rx="3" fill="#0A0A0A" opacity="0.9" />
          <rect x="60" y="145" width="80" height="45" rx="2" fill="#000" />
          <text x="65" y="165" fontSize="8" fill="#00FF41" fontFamily="monospace">$</text>
          <text x="72" y="165" fontSize="8" fill="#00FF41" fontFamily="monospace">running...</text>
          <rect x="65" y="172" width="60" height="2" rx="1" fill="#00FF41" opacity="0.6">
            <animate attributeName="width" values="0;60" dur="1s" repeatCount="indefinite" />
          </rect>
        </g>
      )}

      {subState === "code_work" && (
        <g className="code-work-overlay">
          <rect x="58" y="142" width="84" height="52" rx="3" fill="#1E1E1E" opacity="0.9" />
          <rect x="63" y="147" width="74" height="42" rx="2" fill="#252526" />
          <text x="68" y="162" fontSize="7" fill="#569CD6" fontFamily="monospace">fn</text>
          <text x="85" y="162" fontSize="7" fill="#D4D4D4" fontFamily="monospace">main()</text>
          <text x="68" y="172" fontSize="7" fill="#C586C0" fontFamily="monospace">let</text>
          <text x="85" y="172" fontSize="7" fill="#D4D4D4" fontFamily="monospace">result = ...</text>
          <rect x="68" y="178" width="50" height="2" rx="1" fill="#6A9955" opacity="0.7">
            <animate attributeName="width" values="0;50" dur="1.2s" repeatCount="indefinite" />
          </rect>
        </g>
      )}

      {subState === "searching" && (
        <g className="searching-overlay">
          <circle cx="150" cy="40" r="12" fill="none" stroke="#F6AD55" strokeWidth="2" opacity="0.8">
            <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <path d="M165 54 L175 64" stroke="#F6AD55" strokeWidth="3" strokeLinecap="round" />
          <circle cx="145" cy="35" r="3" fill="#F6AD55" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {subState === "analyzing" && (
        <g className="analyzing-overlay">
          <circle cx="145" cy="35" r="8" fill="none" stroke="#63B3ED" strokeWidth="2" opacity="0.7">
            <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="160" cy="25" r="5" fill="none" stroke="#63B3ED" strokeWidth="1.5" opacity="0.5">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </circle>
          <circle cx="170" cy="15" r="3" fill="none" stroke="#63B3ED" strokeWidth="1" opacity="0.3">
            <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" begin="0.6s" />
          </circle>
        </g>
      )}

      {subState === "curious" && (
        <g className="curious-overlay">
          <path d="M140 30 Q150 20 160 30" stroke="#ECC94B" strokeWidth="2" fill="none" />
          <path d="M145 40 Q150 35 155 40" stroke="#ECC94B" strokeWidth="1.5" fill="none" />
          <circle cx="145" cy="25" r="2" fill="#ECC94B" opacity="0.8" />
          <circle cx="155" cy="25" r="2" fill="#ECC94B" opacity="0.8" />
        </g>
      )}

      {subState === "excited" && (
        <g className="excited-overlay">
          <path d="M140 25 L135 15" stroke="#F1C40F" strokeWidth="2">
            <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M160 25 L165 15" stroke="#F1C40F" strokeWidth="2">
            <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="indefinite" begin="0.1s" />
          </path>
          <circle cx="140" cy="45" r="3" fill="#F1C40F" opacity="0.8">
            <animate attributeName="r" values="2;4;2" dur="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="160" cy="45" r="3" fill="#F1C40F" opacity="0.8">
            <animate attributeName="r" values="2;4;2" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
          </circle>
        </g>
      )}

      {subState === "surprised" && (
        <g className="surprised-overlay">
          <circle cx="150" cy="30" r="15" fill="none" stroke="#ED64A6" strokeWidth="2" opacity="0.8">
            <animate attributeName="r" values="12;18;12" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="150" cy="30" r="8" fill="#ED64A6" opacity="0.6" />
          <text x="145" y="34" fontSize="10" fill="white" fontWeight="bold">?</text>
        </g>
      )}
    </svg>
  );
}