/**
 * A product's daily return is quoted as a base figure tied to its minimum
 * investment (e.g. "UGX 3,500 / day from UGX 15,000"). Investing more than the
 * minimum earns proportionally more, so the figure is never a flat per-product
 * constant: a UGX 20,000 stake in the same product pays UGX 4,667 / day.
 *
 * Every surface that shows, previews or persists a daily return resolves it
 * here, so a card can never display the static base quote for a stake that
 * should be earning a higher amount.
 */
export function calculateDailyReturn(
  baseDailyRewardUGX: number | null | undefined,
  amountUGX: number | null | undefined,
  minInvestUGX: number | null | undefined
): number {
  const base = Math.round(Number(baseDailyRewardUGX) || 0);
  if (base <= 0) return 0;

  const amount = Number(amountUGX) || 0;
  const min = Number(minInvestUGX) || 0;

  // Catalog preview (no stake chosen) or an unknown minimum: the quoted base
  // figure is the best available answer.
  if (amount <= 0 || min <= 0) return base;

  // At or below the minimum investment the product pays exactly its base quote.
  if (amount <= min) return base;

  return Math.round((base * amount) / min);
}

/**
 * The stake a card/panel should quote against: what the user actually put in,
 * falling back to the product minimum for products they do not own yet.
 */
export function resolveInvestedAmount(
  amountInvestedUGX: number | null | undefined,
  minInvestUGX: number | null | undefined
): number {
  return Number(amountInvestedUGX) || Number(minInvestUGX) || 0;
}