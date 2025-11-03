"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { DataService } from "@/lib/data-service"

type DateRangeOption = "this-month" | "last-month"

export function SettingsContent() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("this-month")
  const [qbConnected, setQbConnected] = useState(false)
  const [qbAccountName, setQbAccountName] = useState<string | null>(null)
  const [qbLoading, setQbLoading] = useState(true)
  const { toast } = useToast()

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedDateRange = localStorage.getItem("elas-date-range") as DateRangeOption

    if (savedDateRange) setDateRange(savedDateRange)

    // Check QuickBooks authentication status from API
    const checkAuthStatus = async () => {
      try {
        const authStatus = await DataService.getAuthStatus()
        setQbConnected(authStatus.authenticated)
        if (authStatus.authenticated && authStatus.realm_id) {
          setQbAccountName(`QuickBooks Account (${authStatus.realm_id})`)
        }
      } catch (error) {
        console.error('Failed to check auth status:', error)
        // Fallback to localStorage
        const savedQb = localStorage.getItem("elas-qb-connected")
        const savedQbAccount = localStorage.getItem("elas-qb-account")
        if (savedQb === "true") {
          setQbConnected(true)
          if (savedQbAccount) setQbAccountName(savedQbAccount)
        }
      } finally {
        setQbLoading(false)
      }
    }

    checkAuthStatus()
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("elas-date-range", dateRange)
  }, [dateRange])

  // QuickBooks connect / disconnect handlers
  const handleConnectQuickBooks = async () => {
    try {
      // Check current authentication status
      const authStatus = await DataService.getAuthStatus()
      
      if (authStatus.authenticated) {
        // Already connected
        const accountName = authStatus.realm_id ? `QuickBooks Account (${authStatus.realm_id})` : 'QuickBooks Account'
        setQbConnected(true)
        setQbAccountName(accountName)
        toast({ title: 'Already connected to QuickBooks', description: accountName, duration: 3000 })
        return
      }

      // Initiate OAuth flow with redirect
      const authUrl = await DataService.initiateQuickBooksAuth('sandbox')
      
      // Option 1: Open in new window/tab (preferred for OAuth)
      const authWindow = window.open(authUrl, 'quickbooks-auth', 'width=800,height=600')
      
      // Check if window was blocked
      if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
        // Fallback: Redirect in current window
        toast({ 
          title: 'Redirecting to QuickBooks...', 
          description: 'You will be redirected back after authentication',
          duration: 3000 
        })
        setTimeout(() => {
          window.location.href = authUrl
        }, 1000)
      } else {
        toast({ title: 'Opening QuickBooks authorization...', duration: 3000 })
        
        // Listen for message from popup
        const messageHandler = async (event: MessageEvent) => {
          if (event.data && event.data.type === 'auth-success') {
            // Check if we're now authenticated
            try {
              const newAuthStatus = await DataService.getAuthStatus()
              if (newAuthStatus.authenticated) {
                setQbConnected(true)
                setQbAccountName(`QuickBooks Account (${newAuthStatus.realm_id || 'Connected'})`)
                toast({ title: 'Successfully connected to QuickBooks!', duration: 3000 })
              }
            } catch (error) {
              console.error('Error checking auth status:', error)
            }
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        // Check periodically if the window is closed
        const checkInterval = setInterval(async () => {
          if (authWindow.closed) {
            clearInterval(checkInterval)
            window.removeEventListener('message', messageHandler)
            // Check if we're now authenticated
            try {
              const newAuthStatus = await DataService.getAuthStatus()
              if (newAuthStatus.authenticated) {
                setQbConnected(true)
                setQbAccountName(`QuickBooks Account (${newAuthStatus.realm_id || 'Connected'})`)
                toast({ title: 'Successfully connected to QuickBooks!', duration: 3000 })
              }
            } catch (error) {
              console.error('Error checking auth status:', error)
            }
          }
        }, 1000)
      }
      
    } catch (error) {
      console.error('QuickBooks connect error:', error)
      toast({ 
        title: 'Failed to connect QuickBooks', 
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 4000 
      })
    }
  }

  const handleDisconnectQuickBooks = async () => {
    try {
      setQbLoading(true)
      const result = await DataService.disconnectQuickBooks()
      
      // Always clear local state first
      localStorage.removeItem('elas-qb-connected')
      localStorage.removeItem('elas-qb-account')
      
      // Re-check auth status to see if backend actually disconnected
      let stillConnected = false
      try {
        const authStatus = await DataService.getAuthStatus()
        stillConnected = authStatus.authenticated
      } catch (statusError) {
        console.error('Error checking auth status after disconnect:', statusError)
      }
      
      if (result.success && !stillConnected) {
        // Successfully disconnected - backend cleared tokens
        setQbConnected(false)
        setQbAccountName(null)
        toast({ 
          title: 'Disconnected QuickBooks', 
          description: 'Successfully disconnected from QuickBooks',
          duration: 3000 
        })
      } else if (result.success && stillConnected) {
        // Backend said success but tokens still active
        setQbConnected(false)
        setQbAccountName(null)
        toast({ 
          title: 'Disconnect incomplete', 
          description: 'Backend disconnect reported success, but connection is still active. Please try again or contact support.',
          duration: 6000 
        })
      } else {
        // Backend disconnect failed
        if (stillConnected) {
          // Backend still has tokens - can't disconnect
          setQbConnected(true)
          // Re-fetch account name if available
          try {
            const authStatus = await DataService.getAuthStatus()
            if (authStatus.authenticated && authStatus.realm_id) {
              setQbAccountName(`QuickBooks Account (${authStatus.realm_id})`)
            }
          } catch (e) {
            // Ignore
          }
          toast({ 
            title: 'Disconnect failed', 
            description: result.error || 'Backend server error. QuickBooks connection is still active. Please try again later.',
            duration: 6000 
          })
        } else {
          // Backend failed but tokens are cleared somehow
          setQbConnected(false)
          setQbAccountName(null)
          toast({ 
            title: 'Disconnected (local)', 
            description: result.error || 'Backend error occurred, but connection appears to be cleared.',
            duration: 5000 
          })
        }
      }
    } catch (error) {
      console.error('Error disconnecting QuickBooks:', error)
      
      // Clear local state
      localStorage.removeItem('elas-qb-connected')
      localStorage.removeItem('elas-qb-account')
      
      // Check if still connected on backend
      let stillConnected = false
      try {
        const authStatus = await DataService.getAuthStatus()
        stillConnected = authStatus.authenticated
        if (stillConnected) {
          setQbConnected(true)
          if (authStatus.realm_id) {
            setQbAccountName(`QuickBooks Account (${authStatus.realm_id})`)
          }
        } else {
          setQbConnected(false)
          setQbAccountName(null)
        }
      } catch (statusError) {
        setQbConnected(false)
        setQbAccountName(null)
      }
      
      if (stillConnected) {
        toast({ 
          title: 'Disconnect failed', 
          description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. QuickBooks connection is still active.`,
          duration: 6000 
        })
      } else {
        toast({ 
          title: 'Disconnected (local)', 
          description: `Error occurred, but connection appears to be cleared.`,
          duration: 5000 
        })
      }
    } finally {
      setQbLoading(false)
    }
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value as DateRangeOption)
    toast({
      title: "Settings saved",
      description: "Default date range updated",
      duration: 2000,
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-neutral-900 tracking-tight animate-fade-in">Settings</h1>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-md p-8 space-y-8 hover-lift animate-fade-in" style={{ animationDelay: "0.1s" }}>
         {/* QuickBooks Integration */}
        <div className="space-y-4 p-6 bg-gradient-to-r from-neutral-50 to-white rounded-xl border border-neutral-100">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              QuickBooks Integration
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              Connect your QuickBooks account to sync vendor bills and payments
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              {qbLoading ? (
                <div className="text-sm text-neutral-500">Checking connection...</div>
              ) : qbConnected ? (
                <div className="text-sm text-neutral-700">
                  Connected:{" "}
                  <span className="font-medium">{qbAccountName}</span>
                </div>
              ) : (
                <div className="text-sm text-neutral-500">Not connected</div>
              )}
            </div>

            {qbLoading ? (
              <Button size="sm" disabled>
                Loading...
              </Button>
            ) : qbConnected ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnectQuickBooks}
                disabled={qbLoading}>
                Disconnect
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={handleConnectQuickBooks}
                className="transition-all duration-200 hover:scale-105 hover:shadow-lg bg-slate-900 hover:bg-slate-800 text-white">
                Connect QuickBooks
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-neutral-200" />

        {/* Default Date Range */}
        <div className="space-y-4 p-6 bg-gradient-to-r from-neutral-50 to-white rounded-xl border border-neutral-100">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Default Date Range</h3>
            <p className="text-sm text-neutral-500 mt-1">Choose the default date range for Dashboard views</p>
          </div>

          <RadioGroup value={dateRange} onValueChange={handleDateRangeChange}>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white transition-all duration-200 cursor-pointer">
              <RadioGroupItem value="this-month" id="this-month" />
              <Label htmlFor="this-month" className="font-normal cursor-pointer text-sm">
                This month
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white transition-all duration-200 cursor-pointer">
              <RadioGroupItem value="last-month" id="last-month" />
              <Label htmlFor="last-month" className="font-normal cursor-pointer text-sm">
                Last month
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  )
}