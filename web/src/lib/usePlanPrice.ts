/* One source of truth for the price shown in marketing copy.
 *
 * The price lived as a hardcoded literal in three separate stat strips. That
 * drifts the moment the launch sale ends, and a page advertising $5 while
 * checkout charges $10 is a chargeback rather than a typo. These read the
 * server's /billing/plan instead, which reports the price that is *actually*
 * chargeable — not merely the one the sale flag asks for.
 *
 * The static fallback exists so the landing page still renders a sensible
 * number before the request resolves, or if it fails; it is only ever a
 * placeholder for the authoritative value.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/** Shown until /billing/plan answers. Keep in step with PRICE_LAUNCH_CENTS. */
export const FALLBACK_PRICE_DOLLARS = 5;

export function centsToDollars(cents: number): number {
  return Math.round(cents / 100);
}

export interface PlanPrice {
  /** Whole dollars, for the CountUp numeral in a stat strip. */
  dollars: number;
  /** "Launch price" while the discounted price is genuinely in effect. */
  label: string;
  /** e.g. "$5/mo" — for prose and plain string lists. */
  display: string;
}

export function usePlanPrice(): PlanPrice {
  const { data } = useQuery({
    queryKey: ["plan"],
    queryFn: api.plan,
    // Pricing changes on a deploy, not per interaction.
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const dollars = data ? centsToDollars(data.activeCents) : FALLBACK_PRICE_DOLLARS;
  const label = data?.launchSaleActive ? "Launch price" : "Per month";
  return { dollars, label, display: `$${dollars}/mo` };
}
