/**
 * Terminal character — retro green-on-black terminal cursor
 * Blinking cursor with occasional command flashes
 */
import type { PetSubState } from "../../types/pet";

export function TerminalSVG({ state, subState: _subState }: { state: string; subState?: PetSubState }) {
  const cursorColor = state === "working" ? "#00FF00" : state === "error" ? "#FF4444" : "#00FF41";
  const bgOpacity = state === "sleeping" ? "0.3" : "0.85";

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="terminal-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="terminal-scanlines">
          <feImage result="scan" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='1' fill='%23000' opacity='0.3'/%3E%3C/svg%3E" x="0" y="0" width="100%" height="100%" />
          <feTile in="scan" result="tile" />
          <feComposite in="SourceGraphic" in2="tile" operator="over" />
        </filter>
      </defs>

      {/* Terminal window */}
      <rect x="20" y="30" width="160" height="130" rx="8" fill="#0a0a0a" opacity={bgOpacity} stroke="#333" strokeWidth="2" />
      <rect x="20" y="30" width="160" height="24" rx="8" fill="#1a1a1a" />
      <rect x="20" y="46" width="160" height="8" fill="#1a1a1a" />

      {/* Window buttons */}
      <circle cx="35" cy="42" r="5" fill="#FF5F57" />
      <circle cx="50" cy="42" r="5" fill="#FEBC2E" />
      <circle cx="65" cy="42" r="5" fill="#28C840" />

      {/* Title */}
      <text x="100" y="46" textAnchor="middle" fill="#666" fontSize="10" fontFamily="monospace">hermes@agent</text>

      {/* Terminal content */}
      <g filter="url(#terminal-glow)" fontFamily="monospace" fontSize="11">
        <text x="32" y="72" fill={cursorColor}>$ hermes status</text>
        <text x="32" y="88" fill={cursorColor}>
          {state === "working" ? "▊ Processing..." : state === "thinking" ? "▊ Analyzing..." : state === "done" ? "✓ Complete" : state === "error" ? "✗ Error!" : "▊ Ready"}
        </text>
        {state === "working" && (
          <g>
            <rect x="32" y="94" width="80" height="8" rx="1" fill={cursorColor} opacity="0.3">
              <animate attributeName="width" values="0;80" dur="1.5s" repeatCount="indefinite" />
            </rect>
          </g>
        )}
        {state === "done" && (
          <text x="32" y="104" fill="#00FF41">→ All systems go</text>
        )}
        {state === "error" && (
          <text x="32" y="104" fill="#FF4444">→ Connection failed</text>
        )}
      </g>

      {/* Blinking cursor */}
      <rect x="32" y="112" width="10" height="16" fill={cursorColor} filter="url(#terminal-glow)">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </rect>

      {/* Scanline overlay */}
      <rect x="20" y="30" width="160" height="130" rx="8" fill="url(#scanlines)" opacity="0.05" />

      {/* State indicators */}
      {state === "notification" && (
        <g>
          <circle cx="170" cy="42" r="8" fill="#FF69B4" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x="167" y="46" fill="white" fontSize="10" fontWeight="bold">!</text>
        </g>
      )}

      {state === "sleeping" && (
        <g>
          <rect x="20" y="30" width="160" height="130" rx="8" fill="#000" opacity="0.5" />
          <text x="100" y="100" textAnchor="middle" fill="#333" fontSize="14" fontFamily="monospace">SUSPENDED</text>
        </g>
      )}

      {state === "dragging" && (
        <g>
          <rect x="20" y="30" width="160" height="130" rx="8" fill="none" stroke="#00FF41" strokeWidth="2" strokeDasharray="8 4">
            <animate attributeName="stroke-dashoffset" values="0;12" dur="0.5s" repeatCount="indefinite" />
          </rect>
        </g>
      )}
    </svg>
  );
}
