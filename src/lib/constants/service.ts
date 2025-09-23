export const PRICE_TYPES = ["per_unit", "fixed", "custom", "per_hour"] as const;
export type PriceType = typeof PRICE_TYPES[number];


