"use client"

import { useState, useEffect } from "react"
import { DataService, type ExpenseInvoice, type RentPayment } from "@/lib/data-service"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Search, Info, AlertCircle } from "lucide-react"
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"

export function DashboardContent() {
  // Initialize dates based on user's default preference using lazy initialization
  const [fromDate, setFromDate] = useState<Date | undefined>(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const now = new Date()
    const dateRangeSetting = localStorage.getItem('elas-date-range') || 'this-month'
    
    if (dateRangeSetting === 'last-month') {
      // Last month: first day
      return new Date(now.getFullYear(), now.getMonth() - 1, 1)
    } else {
      // This month (default): first day
      return new Date(now.getFullYear(), now.getMonth(), 1)
    }
  })

  const [toDate, setToDate] = useState<Date | undefined>(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    const now = new Date()
    const dateRangeSetting = localStorage.getItem('elas-date-range') || 'this-month'
    
    if (dateRangeSetting === 'last-month') {
      // Last month: last day
      return new Date(now.getFullYear(), now.getMonth(), 0)
    } else {
      // This month (default): last day
      return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
  })

  const [expenseSearch, setExpenseSearch] = useState("")
  const [rentSearch, setRentSearch] = useState("")
  const [expenses, setExpenses] = useState<ExpenseInvoice[]>([])
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([])
  // Pagination state: default rows per page
  const PAGE_SIZE = 10
  const [expensePage, setExpensePage] = useState(0)
  const [rentPage, setRentPage] = useState(0)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [loadingRent, setLoadingRent] = useState(true)
  const { toast } = useToast()

  // New states to manage global sync overlay and message
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")
  // State for last sync timestamps
  const [lastYardiSync, setLastYardiSync] = useState<string | null>(null)
  // State for QuickBooks connection message
  const [showQbConnectionMessage, setShowQbConnectionMessage] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  // Tooltip-controlled exact-time display (Radix Tooltip handles placement, focus and outside click)

  useEffect(() => {
    // reset to first page when search or date range changes
    setExpensePage(0)
    loadExpenses()
  }, [expenseSearch, fromDate, toDate])

  useEffect(() => {
    // reset to first page when search or date range changes
    setRentPage(0)
    loadRentPayments()
  }, [rentSearch, fromDate, toDate])

  // load last sync timestamps from backend on mount
  useEffect(() => {
    const fetchTimestampsFromBackend = async () => {
      try {
        // Get user ID from localStorage (email or user identifier)
        // For now, we'll use a placeholder userId. Update login to store actual user info
        const userEmail = localStorage.getItem('elas-user-email') || 'user@example.com'
        
        const response = await fetch(`/api/sync-timestamp?userId=${encodeURIComponent(userEmail)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.data) {
            setLastYardiSync(data.data.yardiSync)
          }
        }
      } catch (error) {
        console.error('Error fetching sync timestamps from backend:', error)
        // Fallback to localStorage if backend fetch fails
        setLastYardiSync(prev => prev ?? localStorage.getItem('lastYardiSync'))
      }
    }
    
    fetchTimestampsFromBackend()
  }, [])

  // Function to check QuickBooks connection status
  const checkQuickBooksConnection = async () => {
    try {
      const authStatus = await DataService.getAuthStatus()
      
      // Show message if QuickBooks is not connected
      if (!authStatus.authenticated) {
        setShowQbConnectionMessage(true)
      } else {
        // If connected, hide the message
        setShowQbConnectionMessage(false)
      }
    } catch (error) {
      // If check fails, show the message to prompt connection
      console.error('Error checking auth status:', error)
      setShowQbConnectionMessage(true)
    }
  }

  // Show QuickBooks connection message after login or if not connected
  useEffect(() => {
    const checkAndShowMessage = async () => {
      await checkQuickBooksConnection()
      // Clear the login prompt flag after checking
      localStorage.removeItem('elas-show-qb-prompt')
    }
    
    checkAndShowMessage()
  }, [])

  // Re-check connection status when navigating back to dashboard
  useEffect(() => {
    if (pathname === '/dashboard') {
      // Small delay to ensure settings page state updates are complete
      const timer = setTimeout(() => {
        checkQuickBooksConnection()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  // Check QuickBooks connection status periodically and hide message when connected
  useEffect(() => {
    if (!showQbConnectionMessage) return

    // Check periodically every 2 seconds while message is visible
    const interval = setInterval(() => {
      checkQuickBooksConnection()
    }, 2000)

    // Also check when window regains focus (user comes back from settings)
    const handleFocus = () => {
      checkQuickBooksConnection()
    }
    window.addEventListener('focus', handleFocus)

    // Check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkQuickBooksConnection()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [showQbConnectionMessage])

  const getDateRange = () => {
    const now = new Date()
    let from: string
    let to: string

    if (!fromDate) {
      const f = new Date(now.getFullYear(), now.getMonth(), 1)
      from = f.toISOString().split("T")[0]
    } else {
      from = fromDate.toISOString().split("T")[0]
    }
    
    if (!toDate) {
      const t = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      to = t.toISOString().split("T")[0]
    } else {
      to = toDate.toISOString().split("T")[0]
    }

    return { from, to }
  }

  const loadExpenses = async () => {
    setLoadingExpenses(true)
    const { from, to } = getDateRange()
    const data = await DataService.fetchExpenseInvoices({ from, to, search: expenseSearch })
    setExpenses(data)
    setLoadingExpenses(false)
  }

  const loadRentPayments = async () => {
    setLoadingRent(true)
    const { from, to } = getDateRange()
    const data = await DataService.fetchRentPayments({ from, to, search: rentSearch })
    setRentPayments(data)
    setLoadingRent(false)
  }

  // Helper functions for sync result checking (used by both Yardi and QuickBooks)
  const getCount = (resp: any) => {
    if (!resp) return 0
    if (typeof resp.recordsProcessed === 'number') return resp.recordsProcessed
    if (typeof resp.processed === 'number') return resp.processed
    if (typeof resp.count === 'number') return resp.count
    if (Array.isArray(resp.records)) return resp.records.length
    if (resp.success === true) return 1
    return 0
  }

  const isFail = (resp: any) => {
    if (!resp) return false
    const s = String(resp.status || resp.state || resp.result || '').toLowerCase()
    return s === 'failed' || s === 'error' || s === 'failed_synchronization'
  }

  // Save sync timestamp to localStorage
  const saveTimestampToStorage = (source: 'yardi' | 'quickbooks', timestamp: string) => {
    try {
      const key = source === 'yardi' ? 'lastYardiSync' : 'lastQuickBooksSync'
      localStorage.setItem(key, timestamp)
    } catch (error) {
      console.error('Error saving timestamp to localStorage:', error)
    }
  }

  const handleSyncYardi = async () => {
    try {
      // show global sync overlay
      setSyncing(true)
      setSyncMessage("Loading from Yardi...")
      setLoadingExpenses(true)
      setLoadingRent(true)

      // Sync both bills and receipts from Yardi to QuickBooks
      const [billsSync, receiptsSync] = await Promise.all([
        DataService.syncYardiToQuickBooks('bills', 'chabot'),
        DataService.syncYardiToQuickBooks('receipts', 'chabot')
      ])
      
      // Use helper functions to check results
      const billsCount = getCount(billsSync)
      const receiptsCount = getCount(receiptsSync)
      const totalRecords = billsCount + receiptsCount
      
      const billsFailed = isFail(billsSync)
      const receiptsFailed = isFail(receiptsSync)
      
      const failedSyncs = []
      const completedSyncs = []
      
      if (billsFailed) {
        failedSyncs.push('Bills')
      } else if (billsCount > 0) {
        completedSyncs.push(`Bills (${billsCount} records)`)
      }
      
      if (receiptsFailed) {
        failedSyncs.push('Receipts')
      } else if (receiptsCount > 0) {
        completedSyncs.push(`Receipts (${receiptsCount} records)`)
      }
      
      // Refresh the data first
      await loadExpenses()
      await loadRentPayments()
      
      // Hide sync overlay before showing toast
      setSyncing(false)
      setSyncMessage("")
      setLoadingExpenses(false)
      setLoadingRent(false)
      
      // Small delay to ensure overlay is fully removed before showing toast
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Show appropriate toast message
      if (billsFailed && receiptsFailed) {
        toast({ 
          title: 'Yardi sync failed', 
          description: 'Both bills and receipts sync failed',
          duration: 5000 
        })
      } else if (billsFailed || receiptsFailed) {
        toast({ 
          title: 'Partial sync completed', 
          description: `${failedSyncs[0]} sync failed, but ${completedSyncs.join(' and ')} completed successfully`,
          duration: 5000 
        })
      } else if (completedSyncs.length > 0) {
        toast({ 
          title: 'Yardi sync completed successfully', 
          description: `Synced ${completedSyncs.join(' and ')}. Total: ${totalRecords} records`,
          duration: 5000 
        })
        // record the last successful sync time
        const successTime = new Date().toISOString()
        setLastYardiSync(successTime)
        saveTimestampToStorage('yardi', successTime)
      } else {
        toast({ 
          title: 'Yardi sync completed', 
          description: `Bills: ${billsSync.status}, Receipts: ${receiptsSync.status}. Total: ${totalRecords} records`,
          duration: 5000 
        })
        // record the last successful sync time
        const successTime = new Date().toISOString()
        setLastYardiSync(successTime)
        saveTimestampToStorage('yardi', successTime)
      }
    } catch (error) {
      // Hide sync overlay
      setSyncing(false)
      setSyncMessage("")
      setLoadingExpenses(false)
      setLoadingRent(false)
      
      // Show error toast
      await new Promise(resolve => setTimeout(resolve, 100))
      toast({ 
        title: 'Yardi sync error', 
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000 
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatShortTimestamp = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a')
    } catch (e) {
      return dateStr
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch (e) {
      return dateStr
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      case "open":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-neutral-100 text-neutral-800"
    }
  }

  // Pagination helpers
  const expenseTotalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE))
  const rentTotalPages = Math.max(1, Math.ceil(rentPayments.length / PAGE_SIZE))
  // limit number of visible page buttons - slide window when total pages exceed this
  const MAX_PAGE_BUTTONS = 5
  const computeWindow = (current: number, total: number) => {
    if (total <= MAX_PAGE_BUTTONS) return { start: 0, end: total - 1 }
    // sliding window: start at current page, but clamp so we don't overflow
    let start = current
    if (start < 0) start = 0
    if (start + MAX_PAGE_BUTTONS > total) start = total - MAX_PAGE_BUTTONS
    const end = start + MAX_PAGE_BUTTONS - 1
    return { start, end }
  }
  const expenseWindow = computeWindow(expensePage, expenseTotalPages)
  const rentWindow = computeWindow(rentPage, rentTotalPages)

  return (
    <TooltipProvider>
    <div className="relative">
      <div className="space-y-6">
        {/* QuickBooks Connection Message */}
        {showQbConnectionMessage && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <AlertTitle className="text-blue-900 font-medium">Connect QuickBooks</AlertTitle>
              <AlertDescription className="text-blue-800 mt-1 flex items-center gap-3">
                <span>Go to settings page to connect with QuickBooks</span>
                <Button
                  size="sm"
                  onClick={() => {
                    router.push('/settings')
                  }}
                >
                  Go to Settings
                </Button>
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-1">QuickBooks data synced from approved transactions</p>
          </div>

          <div className="mt-2 sm:mt-0 flex items-center gap-4">
            <div className="flex flex-col items-center animate-slide-in-right" style={{ animationDelay: "0.1s" }}>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleSyncYardi} 
                disabled={syncing}
                className="transition-all duration-200 hover:shadow-md hover:scale-105 hover:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sync from Yardi<Image src="/Yardi.svg" alt="Yardi" className="object-contain ml-2" priority width={20} height={20}/>
              </Button>
              <div className="relative mt-1">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-500">{lastYardiSync ? `Last Sync: ${formatRelativeTime(lastYardiSync)}` : 'Never'}</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label="Show exact Yardi sync time"
                        className="p-1 rounded-sm text-neutral-400 hover:text-neutral-600 transition-colors duration-200"
                        type="button"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      {lastYardiSync ? formatShortTimestamp(lastYardiSync) : 'Never'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-md hover-lift animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white rounded-t-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold text-neutral-900">Expenses (Vendor Bills)</h2>
              <div className="flex items-center gap-3">
                {/* Date pickers to choose the range for the table */}
                <div className="flex gap-3 items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-medium">From</span>
                    <DatePicker
                      date={fromDate}
                      onDateChange={setFromDate}
                      placeholder="Select start date"
                      className="w-[160px]"
                    />
                  </div>
                  <div className="text-neutral-400 self-end mb-2">→</div>
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-medium">To</span>
                    <DatePicker
                      date={toDate}
                      onDateChange={setToDate}
                      placeholder="Select end date"
                      className="w-[160px]"
                    />
                  </div>
                </div>
                <div className="relative w-64 top-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 transition-colors duration-200" />
                  <Input
                    placeholder="Search..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="pl-9 transition-all duration-200 focus:shadow-md"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Doc #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Due
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {loadingExpenses ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-neutral-200 border-t-slate-800 rounded-full animate-spin"></div>
                        <span className="text-sm text-neutral-500">Loading expenses...</span>
                      </div>
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-neutral-300" />
                        <span>No expenses found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // show only the current page of expenses
                  expenses
                    .slice(expensePage * PAGE_SIZE, expensePage * PAGE_SIZE + PAGE_SIZE)
                    .map((expense, index) => (
                    <tr 
                      key={expense.id} 
                      className="hover:bg-neutral-50 transition-all duration-200 cursor-pointer animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{expense.vendorName}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{expense.docNumber}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(expense.dueDate)}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900 text-right font-semibold">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={`${getStatusColor(expense.status)} transition-all duration-200 hover:shadow-md`}>
                          {expense.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination controls for expenses */}
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="text-sm text-neutral-600 font-medium">
              Showing {expenses.length === 0 ? 0 : expensePage * PAGE_SIZE + 1} - {Math.min(expenses.length, (expensePage + 1) * PAGE_SIZE)} of {expenses.length}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setExpensePage((p) => Math.max(0, p - 1))} 
                disabled={expensePage === 0}
                className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                Prev
              </Button>
              {Array.from({ length: expenseWindow.end - expenseWindow.start + 1 }, (_, i) => expenseWindow.start + i).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={p === expensePage ? undefined : "outline"}
                  onClick={() => setExpensePage(p)}
                  aria-current={p === expensePage ? 'page' : undefined}
                  aria-label={`Go to page ${p + 1}`}
                  className={`transition-all duration-200 hover:scale-105 ${p === expensePage ? 'shadow-md' : ''}`}
                >
                  {p + 1}
                </Button>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setExpensePage((p) => Math.min(expenseTotalPages - 1, p + 1))} 
                disabled={expensePage >= expenseTotalPages - 1}
                className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Rent Payments Section */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-md hover-lift animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="p-6 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white rounded-t-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold text-neutral-900">Rent Payments</h2>
              <div className="flex items-center gap-3">
                {/* Same date pickers used for rent payments */}
                <div className="flex gap-3 items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-medium">From</span>
                    <DatePicker
                      date={fromDate}
                      onDateChange={setFromDate}
                      placeholder="Select start date"
                      className="w-[160px]"
                    />
                  </div>
                  <div className="text-neutral-400 self-end mb-2">→</div>
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-medium">To</span>
                    <DatePicker
                      date={toDate}
                      onDateChange={setToDate}
                      placeholder="Select end date"
                      className="w-[160px]"
                    />
                  </div>
                </div>
                <div className="relative w-64 top-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 transition-colors duration-200" />
                  <Input
                    placeholder="Search..."
                    value={rentSearch}
                    onChange={(e) => setRentSearch(e.target.value)}
                    className="pl-9 transition-all duration-200 focus:shadow-md"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Applied Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {loadingRent ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-neutral-200 border-t-slate-800 rounded-full animate-spin"></div>
                        <span className="text-sm text-neutral-500">Loading rent payments...</span>
                      </div>
                    </td>
                  </tr>
                ) : rentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-neutral-300" />
                        <span>No rent payments found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // show only the current page of rent payments
                  rentPayments
                    .slice(rentPage * PAGE_SIZE, rentPage * PAGE_SIZE + PAGE_SIZE)
                    .map((payment, index) => (
                    <tr 
                      key={payment.id} 
                      className="hover:bg-neutral-50 transition-all duration-200 cursor-pointer animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{payment.tenantName}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(payment.paymentDate)}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900 text-right font-semibold">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{payment.reference}</td>
                      <td className="px-6 py-4">
                        {payment.appliedInvoice ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 transition-all duration-200 hover:shadow-md">
                            {payment.appliedInvoice}
                          </Badge>
                        ) : (
                          <span className="text-sm text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination controls for rent payments */}
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="text-sm text-neutral-600 font-medium">
              Showing {rentPayments.length === 0 ? 0 : rentPage * PAGE_SIZE + 1} - {Math.min(rentPayments.length, (rentPage + 1) * PAGE_SIZE)} of {rentPayments.length}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setRentPage((p) => Math.max(0, p - 1))} 
                disabled={rentPage === 0}
                className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                Prev
              </Button>
              {Array.from({ length: rentWindow.end - rentWindow.start + 1 }, (_, i) => rentWindow.start + i).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={p === rentPage ? undefined : "outline"}
                  onClick={() => setRentPage(p)}
                  aria-current={p === rentPage ? 'page' : undefined}
                  aria-label={`Go to page ${p + 1}`}
                  className={`transition-all duration-200 hover:scale-105 ${p === rentPage ? 'shadow-md' : ''}`}
                >
                  {p + 1}
                </Button>
              ))}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setRentPage((p) => Math.min(rentTotalPages - 1, p + 1))} 
                disabled={rentPage >= rentTotalPages - 1}
                className="transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay that blocks interaction and blurs page while syncing */}
      {syncing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-white/70 pointer-events-auto animate-fade-in"
        >
          <div className="flex items-center gap-5 bg-white rounded-2xl p-8 shadow-2xl border border-neutral-200 animate-scale-in">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-neutral-200 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-t-slate-800 border-r-slate-600 rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div>
              <div className="text-xl font-semibold text-neutral-900">{syncMessage}</div>
              <div className="text-sm text-neutral-500 mt-1">Please wait while we sync your data…</div>
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}
