"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Any non-empty inputs succeed
    if (email && password) {
      localStorage.setItem("elas-auth", "true")
      localStorage.setItem("elas-user-email", email)
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-slate-700/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse-slow"></div>
        <div className="absolute w-96 h-96 bg-slate-600/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="bg-neutral-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-700/50 p-8 hover-lift">
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="relative w-32 h-12 transition-transform duration-300 hover:scale-110">
              <Image src="/elas-logo.png" alt="elas." fill className="object-contain" priority />
            </div>
          </div>

          <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h1 className="text-3xl font-semibold text-white mb-2 tracking-tight">Welcome back</h1>
            <p className="text-neutral-400 text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Label htmlFor="email" className="text-neutral-200 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-neutral-900/50 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-white focus:ring-2 focus:ring-white/20 transition-all duration-200 h-11"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Label htmlFor="password" className="text-neutral-200 text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-neutral-900/50 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-white focus:ring-2 focus:ring-white/20 transition-all duration-200 h-11"
                placeholder="••••••••"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-white text-neutral-900 hover:bg-neutral-100 font-medium mt-6 h-11 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in" 
              style={{ animationDelay: "0.4s" }}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
