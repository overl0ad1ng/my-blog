"use client";

import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { ContributionDay } from "@/lib/contribution-calendar";

gsap.registerPlugin(useGSAP);

export interface ProfileTooltipPosition {
  x: number;
  y: number;
  followPointer: boolean;
}

interface ProfileTooltipProps {
  id: string;
  day: ContributionDay;
  position: ProfileTooltipPosition;
  open: boolean;
  onDismiss: () => void;
  onHidden: () => void;
}

export default function ProfileTooltip({ id, day, position, open, onDismiss, onHidden }: ProfileTooltipProps) {
  const tooltip = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const contributions = day.documentation === null ? day.total : day.github;

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({ reduced: "(prefers-reduced-motion: reduce)", normal: "(prefers-reduced-motion: no-preference)" }, (context, contextSafe) => {
      const complete = () => { if (!open) onHidden(); };
      // Keep zero-duration callbacks in this media context, avoiding a cycle
      // with the parent React context when reduced motion completes immediately.
      const finish = contextSafe?.(complete) ?? complete;
      gsap.fromTo(panel.current,
        { autoAlpha: open ? 0 : 1, y: open ? 4 : 0, scale: open ? 0.98 : 1 },
        {
          autoAlpha: open ? 1 : 0, y: open ? 0 : 4, scale: open ? 1 : 0.98,
          duration: context.conditions?.reduced ? 0 : open ? 0.18 : 0.12,
          ease: "power2.out",
          onComplete: () => { finish(); },
        },
      );
    });
    return () => media.revert();
  }, { scope: tooltip, dependencies: [open, onHidden], revertOnUpdate: true });

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(content.current, { autoAlpha: 0.65, y: 2 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: "power2.out" });
    });
    return () => media.revert();
  }, { scope: tooltip, dependencies: [day.date], revertOnUpdate: true });

  useLayoutEffect(() => {
    if (!open) return;
    const element = tooltip.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const offset = 12;
    const margin = 8;
    let { x, y } = position;
    let frame = 0;

    const place = () => {
      frame = 0;
      const left = x + offset + width > window.innerWidth - margin ? x - width - offset : x + offset;
      const top = y + offset + height > window.innerHeight - margin ? y - height - offset : y + offset;
      const boundedX = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      const boundedY = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
      element.style.transform = `translate3d(${boundedX}px, ${boundedY}px, 0)`;
    };
    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      // Pointer movement only updates this element, not every calendar cell.
      if (!frame) frame = window.requestAnimationFrame(place);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    const dismissOnScroll = () => {
      if (!position.followPointer) onDismiss();
    };

    place();
    if (position.followPointer) window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("keydown", dismissOnEscape);
    window.addEventListener("scroll", dismissOnScroll, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("keydown", dismissOnEscape);
      window.removeEventListener("scroll", dismissOnScroll, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [day, position, open, onDismiss]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={tooltip}
      id={id}
      role="tooltip"
      aria-hidden={!open}
      className="pointer-events-none fixed top-0 left-0 z-50 w-56 max-w-[calc(100vw-16px)] font-sans text-xs text-neutral-100"
    >
      <div ref={panel} className="rounded-xl border border-neutral-800/40 bg-neutral-900 px-3 py-2.5 opacity-0 shadow-xl">
        <div ref={content}>
          <div className="flex items-center justify-between">
            <time dateTime={day.date} className="block font-medium tabular-nums">{day.date}</time>
            <p className="text-neutral-400 font-mono">{day.total.toLocaleString("en-US")}</p>
          </div>
          <dl className="mt-2.5 space-y-1.5 border-t border-neutral-800/40 pt-2.5">
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-2 text-neutral-400">
                <span aria-hidden="true" className="size-1.5 rounded-xs bg-blue-400" />
                Contributions
              </dt>
              <dd className="tabular-nums">{contributions.toLocaleString("en-US")}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-2 text-neutral-400">
                <span aria-hidden="true" className="size-1.5 rounded-xs bg-orange-400" />
                Documentation
              </dt>
              <dd className="tabular-nums">{day.documentation === null ? "0" : day.documentation.toLocaleString("en-US")}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>,
    document.body,
  );
}
