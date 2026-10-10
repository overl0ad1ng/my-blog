"use client";

import { useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const transition = { duration: 0.18, ease: "power3.out", overwrite: "auto" as const };
const light = "rgba(237, 237, 237, 1)";
const clear = "rgba(237, 237, 237, 0)";

export default function ProfileCursor({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const container = containerRef.current;
    const cursor = cursorRef.current;
    if (!container || !cursor) return;

    const media = gsap.matchMedia();
    media.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", (_context, contextSafe) => {
      let active = false;
      let day: HTMLElement | null = null;
      let point: { x: number; y: number } | null = null;
      let frame = 0;

      let shape: gsap.core.Tween | undefined;
      let fade: gsap.core.Tween | undefined;

      const dot = { width: 6, height: 6, borderRadius: 3, borderWidth: 0, backgroundColor: light };

      gsap.set(cursor, { ...dot, xPercent: -50, yPercent: -50, autoAlpha: 0, borderColor: light });

      const moveX = gsap.quickTo(cursor, "x", transition);
      const moveY = gsap.quickTo(cursor, "y", transition);

      const hide = (immediate = false) => {
        active = false;
        day = null;
        point = null;

        container.classList.remove("profile-cursor-active");

        window.cancelAnimationFrame(frame);
        frame = 0;

        moveX.tween.pause();
        moveY.tween.pause();

        shape?.kill();
        fade?.kill();

        if (immediate) gsap.set(cursor, { autoAlpha: 0 });
        else fade = gsap.to(cursor, { autoAlpha: 0, duration: 0.1, overwrite: "auto" });
      };

      const place = (target: Element | null, measure = false) => {
        if (!point) return;
        if (!target || !container.contains(target)) {
          hide();
          return;
        }
        const candidate = target.closest<HTMLElement>("[data-date]");
        const nextDay = candidate && container.contains(candidate) ? candidate : null;
        const entering = !active;
        if (entering) {
          // Start at the real pointer, never at a stale off-screen position.
          fade?.kill();
          gsap.set(cursor, { ...dot, x: point.x, y: point.y, autoAlpha: 1 });
          active = true;
          container.classList.add("profile-cursor-active");
        }

        if (nextDay && (entering || nextDay !== day || measure)) {
          const bounds = nextDay.getBoundingClientRect();
          const style = window.getComputedStyle(nextDay);

          moveX(bounds.left + bounds.width / 2, entering ? point.x : undefined);
          moveY(bounds.top + bounds.height / 2, entering ? point.y : undefined);

          shape?.kill();

          shape = gsap.to(cursor, {
            width: bounds.width,
            height: bounds.height,
            borderTopLeftRadius: style.borderTopLeftRadius,
            borderTopRightRadius: style.borderTopRightRadius,
            borderBottomRightRadius: style.borderBottomRightRadius,
            borderBottomLeftRadius: style.borderBottomLeftRadius,
            borderWidth: 1,
            backgroundColor: clear,
            autoRound: false,
            ...transition,
          });

        } else if (!nextDay) {
          moveX(point.x, entering ? point.x : undefined);
          moveY(point.y, entering ? point.y : undefined);
          if (day) {
            shape?.kill();
            shape = gsap.to(cursor, { ...dot, ...transition });
          }
        }
        day = nextDay;
      };

      // Event-created tweens belong to this media context and revert with it.
      const safe = <Args extends unknown[]>(callback: (...args: Args) => void) => {
        const wrapped = contextSafe!(callback);
        return (...args: Args) => { wrapped(...args); };
      };

      const move = safe((event: PointerEvent) => {
        if (event.pointerType === "touch") {
          hide(true);
          return;
        }
        point = { x: event.clientX, y: event.clientY };
        place(event.target instanceof Element ? event.target : null);
      });

      const leave = safe(() => hide());

      const cancel = safe(() => hide(true));

      const keydown = safe((event: KeyboardEvent) => {
        if (event.key === "Tab") hide(true);
      });

      const refresh = safe(() => {
        if (!active || !point || frame) return;

        frame = window.requestAnimationFrame(safe(() => {
          frame = 0;
          if (point) place(document.elementFromPoint(point.x, point.y), true);
        }));
      });

      container.addEventListener("pointerenter", move);
      container.addEventListener("pointermove", move, { passive: true });
      container.addEventListener("pointerleave", leave);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("blur", cancel);
      window.addEventListener("keydown", keydown);
      window.addEventListener("scroll", refresh, true);
      window.addEventListener("resize", refresh);

      return () => {
        container.classList.remove("profile-cursor-active");
        window.cancelAnimationFrame(frame);
        container.removeEventListener("pointerenter", move);
        container.removeEventListener("pointermove", move);
        container.removeEventListener("pointerleave", leave);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("blur", cancel);
        window.removeEventListener("keydown", keydown);
        window.removeEventListener("scroll", refresh, true);
        window.removeEventListener("resize", refresh);
      };
    });
    return () => media.revert();
  }, { scope: cursorRef, dependencies: [containerRef], revertOnUpdate: true });

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="profile-cursor"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 40,
        boxSizing: "border-box",
        pointerEvents: "none",
        visibility: "hidden", opacity: 0,
        border: "0 solid #ededed",
      }}
    />,
    document.body,
  );
}
