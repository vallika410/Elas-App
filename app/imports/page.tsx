"use client"

import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { ImportsContent } from "@/components/imports-content"

export default function ImportsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <ImportsContent />
      </AppShell>
    </AuthGuard>
  )
}
