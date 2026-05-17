/**
 * Magnifying Glass character — cartoon style
 * Friendly magnifier with a curious expression
 */
export function MagnifyingSVG({ state }: { state: string }) {
  const glassColor = state === "working" ? "#4CAF50" : state === "thinking" ? "#2196F3" : "#FFD700";
  const handleColor = "#8B4513";

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`mag-lens-${state}`} cx="40%" cy="35%" r="50%">
          <stop offset="0%" stopColor="#E8F4FD" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#B8D4E8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#87CEEB" stopOpacity="0.3" />
        </radialGradient>
        <filter id="mag-shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Handle */}
      <rect x="115" y="110" width="16" height="60" rx="4" fill={handleColor} transform="rotate(45 123 140)" filter="url(#mag-shadow)" />
      <rect x="118" y="113" width="10" height="54" rx="3" fill="#A0522D" transform="rotate(45 123 140)" />

      {/* Magnifying glass ring */}
      <circle cx="85" cy="80" r="45" fill="none" stroke={glassColor} strokeWidth="10" filter="url(#mag-shadow)">
        {state === "working" && (
          <animate attributeName="stroke" values={`${glassColor};#FFF;${glassColor}`} dur="1.5s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Lens */}
      <circle cx="85" cy="80" r="40" fill={`url(#mag-lens-${state})`} />

      {/* Lens reflection */}
      <ellipse cx="72" cy="65" rx="15" ry="10" fill="white" opacity="0.4" transform="rotate(-30 72 65)" />

      {/* Eyes behind the lens */}
      <g>
        <circle cx="75" cy="78" r="6" fill="white" />
        <circle cx="95" cy="78" r="6" fill="white" />
        <circle cx="75" cy="78" r="3.5" fill="#2C1810" />
        <circle cx="95" cy="78" r="3.5" fill="#2C1810" />
        <circle cx="73" cy="76" r="1.5" fill="white" opacity="0.8" />
        <circle cx="93" cy="76" r="1.5" fill="white" opacity="0.8" />
      </g>

      {/* Mouth */}
      {state === "done" ? (
        <path d="M78 92 Q85 100 92 92" stroke="#2C1810" strokeWidth="2" fill="none" />
      ) : state === "error" ? (
        <circle cx="85" cy="95" r="5" fill="none" stroke="#2C1810" strokeWidth="2" />
      ) : (
        <path d="M80 92 Q85 96 90 92" stroke="#2C1810" strokeWidth="2" fill="none" />
      )}

      {/* Blush */}
      <circle cx="68" cy="88" r="5" fill="#FFB6C1" opacity="0.4" />
      <circle cx="102" cy="88" r="5" fill="#FFB6C1" opacity="0.4" />

      {/* Legs */}
      <g stroke={glassColor} strokeWidth="3" strokeLinecap="round">
        <path d="M60 120 Q55 140 50 155" fill="none">
          {state === "idle" && <animate attributeName="d" values="M60 120 Q55 140 50 155;M60 120 Q52 142 48 158;M60 120 Q55 140 50 155" dur="2s" repeatCount="indefinite" />}
        </path>
        <path d="M110 120 Q115 140 120 155" fill="none">
          {state === "idle" && <animate attributeName="d" values="M110 120 Q115 140 120 155;M110 120 Q118 142 122 158;M110 120 Q115 140 120 155" dur="2s" repeatCount="indefinite" begin="1s" />}
        </path>
      </g>

      {/* Feet */}
      <ellipse cx="50" cy="157" rx="8" ry="4" fill={glassColor} />
      <ellipse cx="120" cy="157" rx="8" ry="4" fill={glassColor} />

      {/* State overlays */}
      {state === "thinking" && (
        <g>
          <circle cx="130" cy="50" r="4" fill="none" stroke="#2196F3" strokeWidth="1.5" opacity="0.6">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="140" cy="38" r="6" fill="none" stroke="#2196F3" strokeWidth="1.5" opacity="0.4">
            <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </circle>
        </g>
      )}

      {state === "working" && (
        <g>
          <rect x="60" y="130" width="50" height="35" rx="3" fill="#333" opacity="0.7" />
          <rect x="63" y="133" width="44" height="29" rx="2" fill="#1a1a2e" />
          <rect x="67" y="138" width="30" height="3" rx="1" fill="#00ff41" opacity="0.8">
            <animate attributeName="width" values="0;30" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect x="67" y="144" width="20" height="3" rx="1" fill="#00ff41" opacity="0.6">
            <animate attributeName="width" values="0;20" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </rect>
        </g>
      )}

      {state === "notification" && (
        <g>
          <circle cx="135" cy="45" r="12" fill="#FF69B4" opacity="0.8">
            <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x="131" y="50" fontSize="14" fill="white" fontWeight="bold">!</text>
        </g>
      )}

      {state === "sleeping" && (
        <g>
          <path d="M70 78 Q75 83 80 78" stroke="#2C1810" strokeWidth="2" fill="none" />
          <path d="M90 78 Q95 83 100 78" stroke="#2C1810" strokeWidth="2" fill="none" />
          <text x="120" y="60" fontSize="12" fill="#9370DB" opacity="0.6">Z</text>
          <text x="132" y="48" fontSize="16" fill="#9370DB" opacity="0.4">
            Z
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
          </text>
        </g>
      )}

      {state === "dragging" && (
        <g>
          <path d="M40 70 L30 65" stroke={glassColor} strokeWidth="2" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M130 70 L140 65" stroke={glassColor} strokeWidth="2" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.5s" repeatCount="indefinite" begin="0.2s" />
          </path>
        </g>
      )}
    </svg>
  );
}
