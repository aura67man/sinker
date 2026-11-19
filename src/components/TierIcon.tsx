import { TIER_SPRITES } from '../art/creatures';
import { TIERS, type Outcome } from '../logic/tiers';
import { PixelSprite } from './PixelSprite';

/** The pixel icon for a tier. Shape differs per tier, so it works without colour. */
export function TierIcon({ tier, scale = 2, labelled = false }: { tier: Outcome; scale?: number; labelled?: boolean }) {
  return (
    <PixelSprite
      sprite={TIER_SPRITES[tier]}
      scale={scale}
      className="tier-icon"
      title={labelled ? TIERS[tier].label : undefined}
    />
  );
}
