"use client"

import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { IntegrationsContent } from "@/components/integrations-content"

export default function IntegrationsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <IntegrationsContent />
      </AppShell>
    </AuthGuard>
  )
}
