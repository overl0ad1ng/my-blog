import { cn } from "cn"

interface EmptyImage {
  className?: string
}

export default function EmptyImage({ className }: EmptyImage) {
  return (
    <div className={cn(
      "w-full relative border rounded-md border-neutral-600 overflow-hidden",
      className,
    )}>
      <svg viewBox="0 0 128 128" preserveAspectRatio="none" className="w-full h-full">
          <line x1="0" y1="0" x2="128" y2="128" stroke="var(--color-neutral-600)" />

          <line x1="128" y1="0" x2="0" y2="128" stroke="var(--color-neutral-600)" />
        </svg>
    </div>
  )
}
