import type { PetName, PetState, PetSubState } from "../../types/pet";
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
}

/**
 * Renders the appropriate character SVG based on characterId.
 * Each character has unique art style and state-specific animations.
 */
export function CharacterRenderer({ characterId, state, subState, eyeX = 0, eyeY = 0 }: CharacterRendererProps) {
  switch (characterId) {
    case "owl":
      return <OwlSVG state={state} subState={subState} eyeX={eyeX} eyeY={eyeY} />;
    case "brain":
      return <BrainSVG state={state} subState={subState} />;
    case "terminal":
      return <TerminalSVG state={state} subState={subState} />;
    case "magnifying":
      return <MagnifyingSVG state={state} subState={subState} />;
    case "paw":
      return <PawSVG state={state} subState={subState} />;
    case "pixie":
      return <PixieSVG state={state} subState={subState} />;
    default:
      return <OwlSVG state={state} subState={subState} eyeX={eyeX} eyeY={eyeY} />;
  }
}
