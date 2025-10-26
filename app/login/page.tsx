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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-green-200/30 rounded-full blur-3xl -top-48 -left-48 animate-pulse-slow"></div>
        <div className="absolute w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="bg-slate-900 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-8 hover-lift">
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="relative w-32 h-12 transition-transform duration-300 hover:scale-110">
              <Image src="/elas-logo.png" alt="elas." fill className="object-contain" priority />
            </div>
          </div>

          <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h1 className="text-3xl font-semibold text-white mb-2 tracking-tight">Welcome back</h1>
            <p className="text-slate-300 text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Label htmlFor="email" className="text-slate-200 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 transition-all duration-200 h-11"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Label htmlFor="password" className="text-slate-200 text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/30 transition-all duration-200 h-11"
                placeholder="••••••••"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-green-600 text-white hover:bg-green-700 font-medium mt-6 h-11 transition-all duration-200 hover:shadow-lg hover:shadow-green-600/30 hover:scale-[1.02] animate-fade-in" 
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
