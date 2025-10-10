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
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-neutral-800/50 backdrop-blur-sm rounded-lg shadow-2xl border border-neutral-700 p-8">
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-12">
              <Image src="/elas-logo.png" alt="elas." fill className="object-contain" priority />
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-white mb-2">Welcome back</h1>
            <p className="text-neutral-400 text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-neutral-900/50 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-neutral-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-neutral-900/50 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-neutral-500"
              />
            </div>

            <Button type="submit" className="w-full bg-white text-neutral-900 hover:bg-neutral-100 font-medium mt-6">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
