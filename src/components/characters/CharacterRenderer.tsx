import type { PetName, PetState, PetSubState } from "../../types/pet";
import { CHARACTER_ANIMATIONS } from "../../types/pet";
import { OwlSVG } from "./OwlCharacter";
import { BrainSVG } from "./BrainCharacter";
import { TerminalSVG } from "./TerminalCharacter";
import { MagnifyingSVG } from "./MagnifyingCharacter";
import { PawSVG } from "./PawCharacter";
import { PixieSVG } from "./PixieCharacter";

interface CharacterRendererProps {
  characterId: PetName;
  state: PetState;
  subState?: PetSubState;
  eyeX?: number;
  eyeY?: number;
  crossFadeOpacity?: number;
  crossFadeTransform?: string;
}

/**
 * Looks up the CSS animation name for a given character + sub-state pair.
 * Returns the animation name (e.g. "terminal-glow") or undefined if none.
 */
function getAnimationName(
  characterId: PetName,
  subState?: PetSubState
): string | undefined {
  if (!subState) return undefined;
  return CHARACTER_ANIMATIONS[characterId]?.[subState];
}

/**
 * Renders the appropriate character SVG based on characterId.
 * Each character has unique art style and state-specific animations.
 * When subState is provided, looks up the animation variant from
 * CHARACTER_ANIMATIONS and applies the corresponding CSS class.
 */
export function CharacterRenderer({
  characterId,
  state,
  subState,
  eyeX = 0,
  eyeY = 0,
  crossFadeOpacity = 1,
  crossFadeTransform,
}: CharacterRendererProps) {
  const animationName = getAnimationName(characterId, subState);
  const animationClass = animationName ? `anim-${animationName}` : "";

  const wrapperClass = ["pet-character-svg-wrapper", animationClass]
    .filter(Boolean)
    .join(" ");

  const wrapperStyle: React.CSSProperties = {
    opacity: crossFadeOpacity,
    transition: "opacity 150ms ease-in-out",
    ...(crossFadeTransform ? { transform: crossFadeTransform } : {}),
  };

  const svgProps = { state, subState, eyeX, eyeY };

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {(() => {
        switch (characterId) {
          case "owl":
            return <OwlSVG {...svgProps} />;
          case "brain":
            return <BrainSVG {...svgProps} />;
          case "terminal":
            return <TerminalSVG {...svgProps} />;
          case "magnifying":
            return <MagnifyingSVG {...svgProps} />;
          case "paw":
            return <PawSVG {...svgProps} />;
          case "pixie":
            return <PixieSVG {...svgProps} />;
          default:
            return <OwlSVG {...svgProps} />;
        }
      })()}
    </div>
  );
}
