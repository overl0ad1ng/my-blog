"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import ProfileTooltip, { type ProfileTooltipPosition } from "./ProfileTooltip";
import ProfileCursor from "./ProfileCursor";
import {
  getContributionLevel, getContributionTone, getUTCDate,
  type ContributionDay, type ContributionInitialData, type ContributionYear,
} from "@/lib/contribution-calendar";

const palettes = {
  empty: ["#262626"],
  github: ["#262626", "#1e3a5f", "#2563a0", "#3b82f6", "#93c5fd"],
  documentation: ["#262626", "#6b361d", "#ad5426", "#ea8535", "#fdba74"],
  mixed: ["#262626", "#4c2c69", "#7944a3", "#a16ad7", "#d8b4fe"],
};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const subscribeHydration = () => () => {};
const getHydrated = () => true;
const getServerHydrated = () => false;

function dayLabel(day: ContributionDay) {
  const total = `${day.total} contribution${day.total === 1 ? "" : "s"}`;
  return day.documentation === null
    ? `${day.date}: ${total} on GitHub. Documentation classification unavailable.`
    : `${day.date}: ${total}. GitHub ${day.github}, documentation ${day.documentation}.`;
}

function CalendarGrid({ data, hydrated }: { data: ContributionYear; hydrated: boolean }) {
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ day: ContributionDay; position: ProfileTooltipPosition; open: boolean } | null>(null);
  const dismissTooltip = useCallback(() => setTooltip((active) => active?.open ? { ...active, open: false } : active), []);
  const removeTooltip = useCallback(() => setTooltip((active) => active?.open ? active : null), []);
  const scroll = useRef<HTMLDivElement | null>(null);
  const total = data.days.reduce((sum, day) => sum + day.total, 0);

  useEffect(() => {
    // On narrow screens, start at the newest week rather than last year's edge.
    if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth;
  }, []);

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <p>
          Contributions
        </p>
        <p className="text-xs text-neutral-400">{total.toLocaleString("en-US")} contributions in the last year</p>
      </div>
      <div
        ref={scroll}
        className="contribution-scroll overflow-x-auto"
        role="region"
        aria-label="Contribution calendar, scroll horizontally for more dates"
        tabIndex={0}
        onPointerLeave={() => setTooltip((active) => active?.position.followPointer && active.open ? { ...active, open: false } : active)}
      >
        <div className="contribution-grid" aria-label="Daily contributions for the last year">
          {data.days.flatMap((day, index) => {
            const date = new Date(`${day.date}T00:00:00Z`);
            const column = Math.floor(index / 7) + 1;
            const row = date.getUTCDay() + 1;
            const tone = getContributionTone(day);

            const label = date.getUTCDate() === 1 && date.getUTCFullYear() === data.year ? (
              <span
                key={`${day.date}-month`}
                data-month={day.date.slice(0, 7)}
                aria-hidden="true"
                className="text-[10px] leading-4 text-neutral-500 whitespace-nowrap select-none"
                style={{ gridColumn: column, gridRow: 8 }}
              >
                {months[date.getUTCMonth()]}
              </span>
            ) : null;

            return [(
              <button
                key={day.date}
                type="button"
                disabled={!hydrated}
                aria-label={dayLabel(day)}
                aria-describedby={tooltip?.open && tooltip.day.date === day.date ? tooltipId : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "touch") return;
                  setTooltip({ day, position: { x: event.clientX, y: event.clientY, followPointer: true }, open: true });
                }}
                onFocus={(event) => {
                  if (!event.currentTarget.matches(":focus-visible")) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  setTooltip({ day, position: { x: bounds.right, y: bounds.bottom, followPointer: false }, open: true });
                }}
                onBlur={() => setTooltip((active) => active?.day.date === day.date && !active.position.followPointer && active.open ? { ...active, open: false } : active)}
                data-date={day.date}
                data-tone={tone}
                data-level={getContributionLevel(day.total)}
                className="size-full rounded-xs outline-offset-2 focus-visible:outline-1 focus-visible:outline-neutral-300"
                style={{
                  gridColumn: column,
                  gridRow: row,
                  backgroundColor: palettes[tone][getContributionLevel(day.total)]
                }}
              />
            ), label];
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-neutral-400">
        {(["github", "documentation", "mixed"] as const).map((tone) => (
          <span key={tone} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-2 rounded-xs" style={{ backgroundColor: palettes[tone][4] }} />
            {tone === "github" ? "GitHub" : tone === "documentation" ? "Documentation" : "Both"}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5" aria-label="Darker to brighter means more contributions">Less
          {palettes.github.map((color) => <span key={color} aria-hidden="true" className="size-2.5 rounded-xs" style={{ backgroundColor: color }} />)} More
        </span>
      </div>
      {hydrated && <ProfileCursor containerRef={scroll} />}
      {tooltip && <ProfileTooltip id={tooltipId} day={tooltip.day} position={tooltip.position} open={tooltip.open} onDismiss={dismissTooltip} onHidden={removeTooltip} />}
    </>
  );
}

export default function ContributionCalendar({ initial }: { initial: ContributionInitialData }) {
  const [data, setData] = useState<ContributionYear | null>(initial.status === "ready" ? initial.contributions : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initial.status === "error");
  const pending = useRef<AbortController | null>(null);
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, getServerHydrated);
  const latestDate = data?.days.at(-1)?.date;

  const load = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/contributions", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const result = await response.json() as { contributions: ContributionYear };
      if (!controller.signal.aborted) setData(result.contributions);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        pending.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (initial.status === "unconfigured") return;
    const refresh = () => {
      if (latestDate && getUTCDate(new Date()) !== latestDate && !pending.current) void load();
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initial.status, latestDate, load]);

  useEffect(() => () => pending.current?.abort(), []);

  return (
    <section aria-label="Contributions" data-hydrated={hydrated} className="space-y-4 pt-6 rounded-lg">
      {initial.status === "unconfigured" ? <p className="text-sm text-neutral-400">Contribution activity is not available yet.</p>
        : loading ? <p role="status" className="py-12 text-center text-sm text-neutral-400">Loading recent contributions…</p>
          : error ? (
            <div role="alert" className="space-y-3 text-sm text-neutral-400">
              <p>Contribution activity could not be loaded.</p>
              <button type="button" disabled={!hydrated} onClick={() => void load()} className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800">Try again</button>
            </div>
          )
            : data && <CalendarGrid key={latestDate} data={data} hydrated={hydrated} />}
    </section>
  );
}
