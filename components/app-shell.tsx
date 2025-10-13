"use client"

import type React from "react"

import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Settings, LogOut, FileText, CheckCircle } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Imports", href: "/imports", icon: FileText },
  { name: "Approvals", href: "/approvals", icon: CheckCircle },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = () => {
    localStorage.removeItem("elas-auth")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <header className="bg-black border-b border-neutral-800 h-16 fixed top-0 left-0 right-0 z-10">
        <div className="h-full px-6 flex items-center">
          <div className="relative w-24 h-8">
            <Image src="/elas-logo.png" alt="elas." fill className="object-contain" priority />
          </div>
        </div>
      </header>

      {/* Left sidebar */}
      <aside className="bg-neutral-900 w-64 fixed left-0 top-16 bottom-0 flex flex-col">
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800",
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 mt-16 p-8">{children}</main>
    </div>
  )
}
