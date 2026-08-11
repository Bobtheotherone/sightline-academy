import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { MODULE_FACTS } from "../lib/modules";
import { CountUp, Reveal } from "../activities/motion";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

/** The analytics table is plain-text-only — strip authoring emphasis marks
 * that have no renderer here (curriculum prompts carry markdown). */
const plainText = (s: string) => s.replace(/[*_`]/g, "");

/* 403, not "locked": the art is the staff-only spur closed off beside the
 * learner's own trail, which carries on open (VISUAL_ASSETS §7.2 B-081).
 * `state-locked` would promise this opens later — it never does. */
function Forbidden() {
  return (
    /* On an elevated sheet and centred in the remaining height — the same
     * depth treatment every other empty surface gets, never bare ground. */
    <div className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-16">
      <Card padding="l" className="w-full rounded-lg">
        <EmptyState
          art={<SlotArt slot="state-403" ratio="5 / 3" />}
          heading="This area is for course staff"
          body="The instructor view holds aggregate course analytics. Your own progress lives on your dashboard."
          action={<LinkButton to="/dashboard">Back to your dashboard</LinkButton>}
        />
      </Card>
    </div>
  );
}

function Overview() {
  const query = useQuery({
    queryKey: ["instructor", "overview"],
    queryFn: () => api.instructorOverview(),
  });

  if (query.isLoading) {
    return (
      <SkeletonGroup label="Loading course analytics" className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
      </SkeletonGroup>
    );
  }

  if (query.error || !query.data) {
    return (
      <Card padding="l">
        <EmptyState
          heading="Couldn't load course analytics"
          body={
            query.error instanceof ApiError && query.error.status === 0
              ? "The connection dropped before the numbers arrived. Check your network and try again."
              : "Something went wrong fetching the overview. Try again in a moment."
          }
          action={
            <Button variant="secondary" onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  }

  const data = query.data;
  if (data.learners === 0) {
    return (
      <Card padding="l">
        <EmptyState
          art={<SlotArt slot="empty-instructor" ratio="5 / 3" />}
          heading="No learner data yet"
          body="Stats appear once the first learners register and start Module 1."
        />
      </Card>
    );
  }

  const moduleTitle = (id: string) => MODULE_FACTS.find((m) => m.id === id)?.title ?? id;
  // Median of integers can land on .5 — CountUp interpolates whole numbers, so
  // a fractional median counts in tenths and renders divided by ten.
  const medianIsWhole = Number.isInteger(data.medianModulesCompleted);

  const shareOfLearners = (n: number) =>
    `${Math.round((n / Math.max(1, data.learners)) * 100)}% of learners`;
  const moduleCount = data.moduleFunnel.length || MODULE_FACTS.length;

  const topline: {
    label: string;
    value: number;
    detail: string;
    format?: (n: number) => string;
  }[] = [
    {
      label: "Learners",
      value: data.learners,
      detail: `${data.moduleFunnel[0]?.started ?? 0} started Module 1`,
    },
    {
      label: "Active last 7 days",
      value: data.activeLast7d,
      detail: shareOfLearners(data.activeLast7d),
    },
    {
      label: "Certificates issued",
      value: data.certificatesIssued,
      detail: shareOfLearners(data.certificatesIssued),
    },
    {
      label: "Median modules completed",
      value: medianIsWhole
        ? data.medianModulesCompleted
        : Math.round(data.medianModulesCompleted * 10),
      detail: `of ${moduleCount} modules`,
      format: medianIsWhole ? undefined : (n) => (n / 10).toFixed(1),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topline.map((card, i) => (
          /* Label at the top, numeral + its denominator pinned to the foot —
           * the row of numerals reads on one baseline however the label wraps. */
          <Reveal key={card.label} index={i} className="h-full">
            <Card padding="m" className="flex h-full flex-col">
              <p className="ts-eyebrow">{card.label}</p>
              <div className="mt-auto pt-5">
                <CountUp
                  value={card.value}
                  format={card.format}
                  delay={i * 60}
                  className="block text-3xl leading-none font-medium text-pine-950"
                />
                <p className="mt-1.5 font-mono text-xs text-ink-500">{card.detail}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <section aria-labelledby="funnel-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="funnel-heading" className="font-display text-xl font-bold">
            Module funnel
          </h2>
          <p className="flex items-center gap-4 text-xs text-ink-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full bg-pine-300" aria-hidden />
              started
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full bg-pine-700" aria-hidden />
              completed
            </span>
          </p>
        </div>
        <Card padding="m" className="mt-4 flex flex-col gap-4">
          {data.moduleFunnel.map((row) => {
            // Normalize to the cohort, not max(started): the reader's reference
            // is the class size, and the funnel must be able to show first-step
            // drop-off rather than pegging its top row at 100%.
            const max = Math.max(1, data.learners);
            return (
              <div key={row.moduleId} className="grid items-center gap-2 sm:grid-cols-[220px_1fr]">
                <span className="text-sm font-medium">{moduleTitle(row.moduleId)}</span>
                <div className="flex flex-col gap-1">
                  <div className="h-2.5 rounded-full bg-line-200">
                    <div
                      className="h-full rounded-full bg-pine-300"
                      style={{ width: `${(row.started / max) * 100}%` }}
                    />
                  </div>
                  <div className="h-2.5 rounded-full bg-line-200">
                    <div
                      className="h-full rounded-full bg-pine-700"
                      style={{ width: `${(row.completed / max) * 100}%` }}
                    />
                  </div>
                  <p className="font-mono text-xs text-ink-500">
                    {row.started} started · {row.completed} completed
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      <section aria-labelledby="checks-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="checks-heading" className="font-display text-xl font-bold">
            Knowledge check insights
          </h2>
          <p className="text-xs text-ink-500">Sorted lowest first-try correct first</p>
        </div>
        {/* Zebra rows on a pine tint (DESIGN-003 v2 §Instructor): the stripe is
         * the scan aid, the hairline stays the row divider. */}
        <Card padding="m" className="relative mt-4">
          {/* Scroll container inside the card, so the mobile swipe cue below can
           * sit fixed at the card's edge instead of scrolling away with rows. */}
          <div className="overflow-x-auto">
          {data.knowledgeCheckStats.length > 0 ? (
            /* Column budget is set by the 375px frame: the checkpoint yields
             * enough width that the first-try percentages — the column the
             * table exists for — clear the card edge before any swipe. */
            <table className="w-full min-w-[440px] table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-line-200 text-xs text-ink-500">
                  <th className="w-[36%] px-3 py-2 font-semibold">Checkpoint</th>
                  <th className="w-[7rem] px-3 py-2 font-semibold sm:w-[9rem]">First-try correct</th>
                  <th className="px-3 py-2 font-semibold">Most-picked wrong answer</th>
                </tr>
              </thead>
              <tbody>
                {data.knowledgeCheckStats.map((row) => {
                  const wrong = row.commonWrong[0];
                  return (
                    <tr
                      key={row.stepId}
                      className="border-b border-line-200 even:bg-pine-100/40 last:border-0"
                    >
                      <td className="px-3 py-2.5 align-top">
                        <span className="line-clamp-2">{plainText(row.prompt)}</span>
                      </td>
                      <td
                        className={`px-4 py-2.5 align-top font-mono whitespace-nowrap ${
                          row.firstAttemptCorrectPct < 50 ? "font-medium text-clay-500" : ""
                        }`}
                      >
                        {Math.round(row.firstAttemptCorrectPct)}%
                      </td>
                      <td className="px-3 py-2.5 align-top text-ink-500">
                        {wrong ? (
                          <span className="flex items-baseline gap-3">
                            <span className="min-w-0 flex-1 truncate">{wrong.text}</span>
                            <span className="ml-auto shrink-0 font-mono text-xs">
                              {Math.round(wrong.pct)}%
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink-500">None recorded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ink-500">
              No checkpoint attempts yet — this fills in as learners hit their first knowledge
              checks.
            </p>
          )}
          </div>
          {/* Below sm the wrong-answer column sits past the fold; the fade says
           * "there's more" — without it clipped digits read as broken layout.
           * right-6 anchors it to the scroller's clip edge (inside the card's
           * p-6), where right-0 would fade nothing but empty padding. */}
          {data.knowledgeCheckStats.length > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-6 w-10 bg-gradient-to-l from-paper-50 to-transparent sm:hidden"
            />
          )}
        </Card>
      </section>

      <section aria-labelledby="themes-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="themes-heading" className="font-display text-xl font-bold">
            Ranger themes
          </h2>
          <p className="text-xs text-ink-500">What learners ask — and what Ranger declines</p>
        </div>
        <Card padding="m" className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="ts-eyebrow">Questions by course topic</p>
            {data.tutorThemes.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {data.tutorThemes.map((theme) => (
                  <span
                    key={theme.topic}
                    className="rounded-sm border border-line-200 bg-moss-100 px-3 py-1.5 text-sm"
                  >
                    {theme.topic}{" "}
                    <span className="font-mono text-xs text-ink-500">×{theme.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">
                No Ranger questions yet — topics appear as learners start asking.
              </p>
            )}
          </div>
          <div>
            <p className="ts-eyebrow">Triage events by category</p>
            {data.triageCounts.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {data.triageCounts.map((row) => (
                  <span
                    key={row.category}
                    className="rounded-sm border border-sun-400/50 bg-sun-400/10 px-3 py-1.5 text-sm"
                  >
                    {row.category.replaceAll("_", " ")}{" "}
                    <span className="font-mono text-xs text-ink-500">×{row.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">
                No triage events — nobody has pushed Ranger's boundaries.
              </p>
            )}
          </div>
        </Card>
      </section>

    </div>
  );
}

export default function InstructorPage() {
  const { user } = useSession();
  if (user?.role !== "instructor") return <Forbidden />;

  return (
    <div className="mx-auto w-full max-w-page flex-1 px-6 py-10 lg:px-12">
      {/* Title + scope on the left, the one action on the right — the band
       * composes to its edges (DESIGN-003 v2 §standing rule 1). */}
      <Reveal index={0} className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <p className="ts-eyebrow">Instructor</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Course overview</h1>
          <p className="mt-2 max-w-2xl text-ink-500">
            Aggregate signals only — no per-learner drill-down, no emails, no message text.
          </p>
        </div>
        <a
          href={api.instructorExportUrl}
          download
          className="inline-flex h-10 w-fit items-center gap-2 rounded-sm border border-pine-700 bg-paper-0 px-4 text-sm font-medium text-pine-700 transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-px hover:bg-moss-100 hover:shadow-1"
        >
          <Download className="size-4" strokeWidth={1.5} aria-hidden />
          Export CSV
        </a>
      </Reveal>
      <div className="mt-8">
        <Overview />
      </div>
    </div>
  );
}
