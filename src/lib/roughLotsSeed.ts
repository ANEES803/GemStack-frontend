/**
 * Demo rough lots for linking inventory items to purchase lots.
 * Keep `code` values aligned with the Lots list (`src/app/(main)/lots/page.tsx` SEED).
 */
export type RoughLotOption = {
  code: string;
  supplier: string;
};

export const ROUGH_LOTS_SEED: readonly RoughLotOption[] = [
  { code: "LO-09", supplier: "Sapphire Co." },
  { code: "LO-08", supplier: "Global Gems Ltd" },
  { code: "LO-07", supplier: "Sapphire Co." },
  { code: "LO-06", supplier: "Ceylon Traders" },
] as const;
