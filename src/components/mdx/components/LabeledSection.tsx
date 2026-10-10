import { cn } from "cn";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface LabeledSectionProps extends ComponentPropsWithoutRef<"section"> {
  label: ReactNode;
}

export default function LabeledSection({ label, children, className, ...props }: LabeledSectionProps) {
  return (
    <section
      {...props}
      className={cn("my-6 grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-x-4 sm:gap-x-6", className)}
    >
      <h2 className="m-0 min-w-0 whitespace-normal text-sm font-medium leading-7 text-neutral-400 [overflow-wrap:anywhere]">
        {label}
      </h2>
      <div className="min-w-0 [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </section>
  );
}
