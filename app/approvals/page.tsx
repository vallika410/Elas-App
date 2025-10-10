"use client"

import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { ApprovalsContent } from "@/components/approvals-content"

export default function ApprovalsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <ApprovalsContent />
      </AppShell>
    </AuthGuard>
  )
}
