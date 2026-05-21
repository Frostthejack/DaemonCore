/**
 * Paw character — cartoon style
 * Soft round paw pad that stretches and boops. Loyal and playful.
 */
import type { PetSubState } from "../../types/pet";

export function PawSVG({ state, subState: _subState }: { state: string; subState?: PetSubState }) {
  const pawColor = state === "error" ? "#CC6666" : state === "working" ? "#88CC88" : "#FFB6C1";
  const padColor = state === "error" ? "#AA5555" : state === "working" ? "#66AA66" : "#FF91A4";

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`paw-main-${state}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={pawColor} />
          <stop offset="100%" stopColor={padColor} />
        </radialGradient>
        <filter id="paw-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Main paw pad */}
      <ellipse cx="100" cy="120" rx="45" ry="40" fill={`url(#paw-main-${state})`} filter="url(#paw-shadow)">
        {state === "idle" && (
          <animate attributeName="ry" values="40;43;40" dur="2s" repeatCount="indefinite" />
        )}
        {state === "dragging" && (
          <animate attributeName="rx" values="45;50;45" dur="0.3s" repeatCount="indefinite" />
        )}
      </ellipse>

      {/* Toe beans */}
      <ellipse cx="65" cy="75" rx="18" ry="20" fill={`url(#paw-main-${state})`} filter="url(#paw-shadow)">
        {state === "idle" && (
          <animate attributeName="ry" values="20;22;20" dur="1.8s" repeatCount="indefinite" begin="0.2s" />
        )}
      </ellipse>
      <ellipse cx="100" cy="60" rx="18" ry="22" fill={`url(#paw-main-${state})`} filter="url(#paw-shadow)">
        {state === "idle" && (
          <animate attributeName="ry" values="22;24;22" dur="1.8s" repeatCount="indefinite" begin="0.4s" />
        )}
      </ellipse>
      <ellipse cx="135" cy="75" rx="18" ry="20" fill={`url(#paw-main-${state})`} filter="url(#paw-shadow)">
        {state === "idle" && (
          <animate attributeName="ry" values="20;22;20" dur="1.8s" repeatCount="indefinite" begin="0.6s" />
        )}
      </ellipse>

      {/* Small toe beans (higher) */}
      <ellipse cx="82" cy="50" rx="12" ry="14" fill={`url(#paw-main-${state})`} opacity="0.8" />

      {/* Paw pad details (lighter inner) */}
      <ellipse cx="100" cy="115" rx="25" ry="22" fill="white" opacity="0.15" />
      <ellipse cx="65" cy="72" rx="10" ry="11" fill="white" opacity="0.15" />
      <ellipse cx="100" cy="56" rx="10" ry="12" fill="white" opacity="0.15" />
      <ellipse cx="135" cy="72" rx="10" ry="11" fill="white" opacity="0.15" />

      {/* Eyes on the main pad */}
      {state !== "sleeping" ? (
        <g>
          <circle cx="85" cy="115" r="7" fill="white" />
          <circle cx="115" cy="115" r="7" fill="white" />
          <circle cx="85" cy="115" r="4" fill="#2C1810" />
          <circle cx="115" cy="115" r="4" fill="#2C1810" />
          <circle cx="83" cy="113" r="2" fill="white" opacity="0.8" />
          <circle cx="113" cy="113" r="2" fill="white" opacity="0.8" />
        </g>
      ) : (
        <g>
          <path d="M78 115 Q85 120 92 115" stroke="#2C1810" strokeWidth="2" fill="none" />
          <path d="M108 115 Q115 120 122 115" stroke="#2C1810" strokeWidth="2" fill="none" />
        </g>
      )}

      {/* Mouth */}
      {state === "done" ? (
        <g>
          <path d="M92 130 Q100 140 108 130" stroke="#2C1810" strokeWidth="2" fill="none" />
        </g>
      ) : state === "error" ? (
        <ellipse cx="100" cy="132" rx="6" ry="4" fill="none" stroke="#2C1810" strokeWidth="2" />
      ) : (
        <path d="M96 130 Q100 134 104 130" stroke="#2C1810" strokeWidth="2" fill="none" />
      )}

      {/* Blush */}
      <circle cx="75" cy="125" r="6" fill="#FF69B4" opacity="0.3" />
      <circle cx="125" cy="125" r="6" fill="#FF69B4" opacity="0.3" />

      {/* State overlays */}
      {state === "thinking" && (
        <g>
          <circle cx="140" cy="45" r="4" fill="none" stroke="#87CEEB" strokeWidth="1.5" opacity="0.6">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="150" cy="32" r="6" fill="none" stroke="#87CEEB" strokeWidth="1.5" opacity="0.4">
            <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </circle>
        </g>
      )}

      {state === "working" && (
        <g>
          <rect x="70" y="145" width="60" height="40" rx="5" fill="#333" opacity="0.7" />
          <rect x="74" y="149" width="52" height="32" rx="3" fill="#1a1a2e" />
          <rect x="78" y="154" width="35" height="3" rx="1" fill="#00ff41" opacity="0.8">
            <animate attributeName="width" values="0;35" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect x="78" y="160" width="25" height="3" rx="1" fill="#00ff41" opacity="0.6">
            <animate attributeName="width" values="0;25" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </rect>
          <rect x="78" y="166" width="30" height="3" rx="1" fill="#00ff41" opacity="0.7">
            <animate attributeName="width" values="0;30" dur="1.8s" repeatCount="indefinite" begin="0.6s" />
          </rect>
        </g>
      )}

      {state === "notification" && (
        <g>
          <circle cx="150" cy="40" r="12" fill="#FF69B4" opacity="0.8">
            <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x="146" y="45" fontSize="14" fill="white" fontWeight="bold">!</text>
        </g>
      )}

      {state === "sleeping" && (
        <g>
          <text x="130" y="50" fontSize="14" fill="#9370DB" opacity="0.6">Z</text>
          <text x="143" y="35" fontSize="18" fill="#9370DB" opacity="0.4">
            Z
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
          </text>
        </g>
      )}

      {state === "dragging" && (
        <g>
          <path d="M45 100 L35 95" stroke={pawColor} strokeWidth="2" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M45 110 L33 108" stroke={pawColor} strokeWidth="2" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.2s" />
          </path>
          <path d="M155 100 L165 95" stroke={pawColor} strokeWidth="2" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.5s" repeatCount="indefinite" begin="0.1s" />
          </path>
          <path d="M155 110 L167 108" stroke={pawColor} strokeWidth="2" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.3s" />
          </path>
        </g>
      )}

      {state === "done" && (
        <g>
          <text x="145" y="50" fontSize="28" fill="#FFD700">
            ✓
            <animateTransform attributeName="transform" type="scale" values="0.8;1.2;0.8" dur="1s" repeatCount="indefinite" />
          </text>
        </g>
      )}
    </svg>
  );
}
