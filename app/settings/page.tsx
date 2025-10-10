"use client"

import { AppShell } from "@/components/app-shell"
import { AuthGuard } from "@/components/auth-guard"
import { SettingsContent } from "@/components/settings-content"

export default function SettingsPage() {
  return (
    <AuthGuard>
      <AppShell>
        <SettingsContent />
      </AppShell>
    </AuthGuard>
  )
}
