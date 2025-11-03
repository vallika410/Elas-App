"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Settings } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.02_140)]">
      {/* Top bar */}
      <header className="bg-black border-b border-neutral-800 h-16 fixed top-0 left-0 right-0 z-10 animate-slide-in-left">
        <div className="h-full px-6 flex items-center">
          <div className="relative w-24 h-8 transition-transform duration-300 hover:scale-105">
            <Image src="/elas-logo.png" alt="elas." fill className="object-contain" priority />
          </div>
        </div>
      </header>

      {/* Left sidebar */}
      <aside className="bg-slate-800 w-62 fixed left-6 top-20 bottom-4 flex flex-col rounded-2xl shadow-xl border border-slate-700 animate-slide-in-left backdrop-blur-sm" style={{ animationDelay: "0.1s" }}>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-slate-900 text-white shadow-lg" 
                    : "text-slate-300 hover:bg-slate-700 hover:text-white hover:shadow-md hover:translate-x-1",
                )}
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r animate-slide-in-left" />
                )}
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )} />
                <span className="relative">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="ml-64 mt-16 p-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>{children}</main>
    </div>
  )
}
