import { cn } from "cn"
import React from "react"

interface Tag {
  children: React.ReactNode
  className: string
}

export default function Tag({ children, className }: Tag) {
  return (
    <div className={cn("px-1.5 py-0.5 text-sm text-neutral-200 rounded-lg border border-neutral-600", className)}>
      {children}
    </div>
  )
}
