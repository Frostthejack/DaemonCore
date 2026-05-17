import type { PetName, PetState } from "../../types/pet";
import { OwlSVG } from "./OwlCharacter";
import { BrainSVG } from "./BrainCharacter";
import { TerminalSVG } from "./TerminalCharacter";
import { MagnifyingSVG } from "./MagnifyingCharacter";
import { PawSVG } from "./PawCharacter";
import { PixieSVG } from "./PixieCharacter";

interface CharacterRendererProps {
  characterId: PetName;
  state: PetState;
  eyeX?: number;
  eyeY?: number;
}

/**
 * Renders the appropriate character SVG based on characterId.
 * Each character has unique art style and state-specific animations.
 */
export function CharacterRenderer({ characterId, state, eyeX = 0, eyeY = 0 }: CharacterRendererProps) {
  switch (characterId) {
    case "owl":
      return <OwlSVG state={state} eyeX={eyeX} eyeY={eyeY} />;
    case "brain":
      return <BrainSVG state={state} />;
    case "terminal":
      return <TerminalSVG state={state} />;
    case "magnifying":
      return <MagnifyingSVG state={state} />;
    case "paw":
      return <PawSVG state={state} />;
    case "pixie":
      return <PixieSVG state={state} />;
    default:
      return <OwlSVG state={state} eyeX={eyeX} eyeY={eyeY} />;
  }
}
