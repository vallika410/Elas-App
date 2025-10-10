"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"

type DateRangeOption = "this-month" | "last-month"

export function SettingsContent() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("this-month")
  const [clearingAccount, setClearingAccount] = useState("Clearing Account")
  const [qbConnected, setQbConnected] = useState(false)
  const [qbAccountName, setQbAccountName] = useState<string | null>(null)
  const { toast } = useToast()

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedDateRange = localStorage.getItem("elas-date-range") as DateRangeOption
    const savedClearingAccount = localStorage.getItem("elas-clearing-account")

    const savedQb = localStorage.getItem("elas-qb-connected")
    const savedQbAccount = localStorage.getItem("elas-qb-account")

    if (savedQb === "true") {
      setQbConnected(true)
      if (savedQbAccount) setQbAccountName(savedQbAccount)
    }

    if (savedDateRange) setDateRange(savedDateRange)
    if (savedClearingAccount) setClearingAccount(savedClearingAccount)
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("elas-date-range", dateRange)
    localStorage.setItem("elas-clearing-account", clearingAccount)
  }, [dateRange, clearingAccount])

  // QuickBooks connect / disconnect handlers
  const handleConnectQuickBooks = async () => {
    const authUrl = process.env.NEXT_PUBLIC_QB_AUTH_URL || ''

    try {
      const res = await fetch('/api/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'SELECT * FROM Bill STARTPOSITION 1 MAXRESULTS 1' }),
      })

      const json = await res.json().catch(() => ({}))

      if (res.ok && json && json.ok) {
        // Consider this a successful server-side connection. Persist state.
        const accountName = json?.data?.QueryResponse?.Bill ? 'QuickBooks Account' : 'QuickBooks Account'
        localStorage.setItem('elas-qb-connected', 'true')
        localStorage.setItem('elas-qb-account', accountName)
        setQbConnected(true)
        setQbAccountName(accountName)
        toast({ title: 'Connected to QuickBooks', description: accountName, duration: 3000 })
        return
      }

      // If server call failed (no tokens / unauth), open OAuth URL when available
      const errMsg = json?.message || `Server returned ${res.status}`
      if (authUrl) {
        window.open(authUrl, '_blank', 'width=600,height=700')
        toast({ title: 'Opened QuickBooks connect window', description: errMsg, duration: 4000 })
        return
      }

      // Fallback/demo connect for local dev when no OAuth URL is configured
      const demoName = 'Demo QuickBooks Account'
      localStorage.setItem('elas-qb-connected', 'true')
      localStorage.setItem('elas-qb-account', demoName)
      setQbConnected(true)
      setQbAccountName(demoName)
      toast({ title: 'Connected to QuickBooks (demo)', description: demoName, duration: 3000 })
    } catch (err: any) {
      // Network or unexpected error: open OAuth or fallback
      if (authUrl) {
        window.open(authUrl, '_blank', 'width=600,height=700')
        toast({ title: 'Opened QuickBooks connect window', description: String(err?.message || err), duration: 4000 })
        return
      }

      const demoName = 'Demo QuickBooks Account'
      localStorage.setItem('elas-qb-connected', 'true')
      localStorage.setItem('elas-qb-account', demoName)
      setQbConnected(true)
      setQbAccountName(demoName)
      toast({ title: 'Connected to QuickBooks (demo)', description: demoName, duration: 3000 })
    }
  }

  const handleDisconnectQuickBooks = () => {
    localStorage.removeItem('elas-qb-connected')
    localStorage.removeItem('elas-qb-account')
    setQbConnected(false)
    setQbAccountName(null)
    toast({ title: 'Disconnected QuickBooks', duration: 2000 })
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value as DateRangeOption)
    toast({
      title: "Settings saved",
      description: "Default date range updated",
      duration: 2000,
    })
  }

  const handleClearingAccountBlur = () => {
    toast({
      title: "Settings saved",
      description: "Clearing account updated",
      duration: 2000,
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>

      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 space-y-8">
        {/* Default Date Range */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-medium text-neutral-900">Default Date Range</h3>
            <p className="text-sm text-neutral-500 mt-1">Choose the default date range for Dashboard views</p>
          </div>

          <RadioGroup value={dateRange} onValueChange={handleDateRangeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="this-month" id="this-month" />
              <Label htmlFor="this-month" className="font-normal cursor-pointer">
                This month
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="last-month" id="last-month" />
              <Label htmlFor="last-month" className="font-normal cursor-pointer">
                Last month
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="border-t border-neutral-200" />

        {/* Clearing Account */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-medium text-neutral-900">Clearing Account</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Account name used for Journal Entries when receipts don't match invoices
            </p>
          </div>

          <div className="max-w-md">
            <Input
              value={clearingAccount}
              onChange={(e) => setClearingAccount(e.target.value)}
              onBlur={handleClearingAccountBlur}
              placeholder="Enter clearing account name"
            />
          </div>
        </div>
      </div>

        <div className="border-t border-neutral-200" />

        {/* QuickBooks Integration */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-medium text-neutral-900">QuickBooks Integration</h3>
            <p className="text-sm text-neutral-500 mt-1">Connect your QuickBooks account to sync vendor bills and payments</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              {qbConnected ? (
                <div className="text-sm text-neutral-700">
                  Connected: <span className="font-medium">{qbAccountName}</span>
                </div>
              ) : (
                <div className="text-sm text-neutral-500">Not connected</div>
              )}
            </div>

            {qbConnected ? (
              <Button variant="destructive" size="sm" onClick={handleDisconnectQuickBooks}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnectQuickBooks}>
                Connect QuickBooks
              </Button>
            )}
          </div>
        </div>
    </div>
  )
}
