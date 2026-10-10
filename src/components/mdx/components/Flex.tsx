import { cn } from "cn"
import React from "react"

interface Flex {
  wrap: boolean
  children: React.ReactNode
}

export default function Flex({ wrap, children }: Flex) {
  return (
    <div className={cn("flex gap-2", wrap && "flex-wrap")}>
      {children}
    </div>
  )
}
