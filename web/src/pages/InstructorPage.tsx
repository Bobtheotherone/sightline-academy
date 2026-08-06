import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { MODULE_FACTS } from "../lib/modules";
import { Card } from "../components/Card";
import { Button, LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SlotArt } from "../components/SlotArt";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

function Forbidden() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <EmptyState
        art={<SlotArt slot="state-locked" ratio="5 / 3" />}
        heading="This area is for course staff"
        body="The instructor view holds aggregate course analytics. Your own progress lives on your dashboard."
        action={<LinkButton to="/dashboard">Back to your dashboard</LinkButton>}
      />
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
          heading="No learner data yet"
          body="Stats appear once the first learners register and start Module 1."
        />
      </Card>
    );
  }

  const moduleTitle = (id: string) => MODULE_FACTS.find((m) => m.id === id)?.title ?? id;
  // Median of integers can land on .5 — show one decimal only when it does.
  const median = Number.isInteger(data.medianModulesCompleted)
    ? String(data.medianModulesCompleted)
    : data.medianModulesCompleted.toFixed(1);

  const topline = [
    { label: "Learners", value: String(data.learners) },
    { label: "Active last 7 days", value: String(data.activeLast7d) },
    { label: "Certificates issued", value: String(data.certificatesIssued) },
    { label: "Median modules completed", value: median },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topline.map((card) => (
          <Card key={card.label} padding="m">
            <p className="ts-eyebrow">{card.label}</p>
            <p className="mt-2 font-mono text-3xl font-medium">{card.value}</p>
          </Card>
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
            const max = Math.max(1, ...data.moduleFunnel.map((r) => r.started));
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
        <Card padding="m" className="mt-4 overflow-x-auto">
          {data.knowledgeCheckStats.length > 0 ? (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line-200 text-xs text-ink-500">
                  <th className="py-2 pr-4 font-semibold">Checkpoint</th>
                  <th className="py-2 pr-4 font-semibold">First-try correct</th>
                  <th className="py-2 font-semibold">Most-picked wrong answer</th>
                </tr>
              </thead>
              <tbody>
                {data.knowledgeCheckStats.map((row) => {
                  const wrong = row.commonWrong[0];
                  return (
                    <tr key={row.stepId} className="border-b border-line-200 last:border-0">
                      <td className="max-w-[280px] truncate py-2.5 pr-4">{row.prompt}</td>
                      <td
                        className={`py-2.5 pr-4 font-mono ${
                          row.firstAttemptCorrectPct < 50 ? "font-medium text-clay-500" : ""
                        }`}
                      >
                        {Math.round(row.firstAttemptCorrectPct)}%
                      </td>
                      <td className="max-w-[260px] py-2.5 text-ink-500">
                        {wrong ? (
                          <span className="flex items-baseline gap-2">
                            <span className="min-w-0 truncate">{wrong.text}</span>
                            <span className="shrink-0 font-mono text-xs">
                              {Math.round(wrong.pct)}%
                            </span>
                          </span>
                        ) : (
                          "—"
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
        </Card>
      </section>

      <section aria-labelledby="themes-heading">
        <h2 id="themes-heading" className="font-display text-xl font-bold">
          Ranger themes
        </h2>
        <Card padding="m" className="mt-4 flex flex-col gap-5">
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

      <a
        href={api.instructorExportUrl}
        download
        className="inline-flex h-10 w-fit items-center gap-2 rounded-sm border border-pine-700 bg-paper-0 px-4 text-sm font-medium text-pine-700 transition-all duration-(--ts-dur-fast) hover:bg-moss-100"
      >
        <Download className="size-4" strokeWidth={1.5} aria-hidden />
        Export CSV
      </a>
    </div>
  );
}

export default function InstructorPage() {
  const { user } = useSession();
  if (user?.role !== "instructor") return <Forbidden />;

  return (
    <div className="mx-auto w-full max-w-page flex-1 px-6 py-10 lg:px-12">
      <p className="ts-eyebrow">Instructor</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold">Course overview</h1>
      <p className="mt-2 max-w-xl text-ink-500">
        Aggregate signals only — no per-learner drill-down, no emails, no message text.
      </p>
      <div className="mt-8">
        <Overview />
      </div>
    </div>
  );
}
