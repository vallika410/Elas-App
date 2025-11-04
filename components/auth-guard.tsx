"use client"

import type React from "react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  // No authentication required - just render children
  return <>{children}</>
}
