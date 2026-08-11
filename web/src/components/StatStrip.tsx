import { CountUp } from "../activities/motion";

export type Stat = {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  /** Custom numeral rendering, e.g. thousands separators. */
  format?: (n: number) => string;
};

/**
 * Row of mono stat items (DESIGN-002 v2): a big counting numeral over a small
 * caps label. Values count up on reveal, staggered 60ms apart; the row wraps
 * on mobile instead of shrinking the numerals.
 */
const GRID: Record<number, string> = {
  2: "grid grid-cols-2",
  3: "grid grid-cols-3",
  4: "grid grid-cols-4",
};

export function StatStrip({
  items,
  onDark = false,
  columns,
  className = "",
}: {
  items: Stat[];
  onDark?: boolean;
  /** Fixed grid instead of wrapping flex — for narrow columns where the wrap
   * would orphan the last stat onto its own ragged row. */
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <dl className={`${columns ? GRID[columns] : "flex flex-wrap"} gap-x-10 gap-y-6 ${className}`}>
      {items.map((stat, i) => (
        <div key={stat.label} className="flex min-w-24 flex-col-reverse">
          <dt
            className={`mt-1.5 text-xs font-semibold tracking-[0.08em] uppercase ${
              onDark ? "text-paper-0/70" : "text-ink-500"
            }`}
          >
            {stat.label}
          </dt>
          <dd className={onDark ? "text-paper-0" : "text-pine-950"}>
            <CountUp
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              format={stat.format}
              delay={i * 60}
              className="text-2xl leading-none font-medium"
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
