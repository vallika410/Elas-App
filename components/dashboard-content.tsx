"use client"

import { useState, useEffect } from "react"
import { DataService, type ExpenseInvoice, type RentPayment } from "@/lib/data-service"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Info } from "lucide-react"
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import Image from "next/image"

export function DashboardContent() {
  // Separate date ranges for Expenses and Rent sections
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")

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
  const [lastQuickBooksSync, setLastQuickBooksSync] = useState<string | null>(null)
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

  // load last sync timestamps from localStorage on mount
  useEffect(() => {
    try {
      const y = localStorage.getItem('lastYardiSync')
      const q = localStorage.getItem('lastQuickBooksSync')
      setLastYardiSync(y)
      setLastQuickBooksSync(q)
    } catch (e) {
      // ignore localStorage errors in SSR/privileged contexts
    }
  }, [])

  const getDateRange = () => {
    const now = new Date()
    let from = fromDate
    let to = toDate

    if (!from) {
      const f = new Date(now.getFullYear(), now.getMonth(), 1)
      from = f.toISOString().split("T")[0]
    }
    if (!to) {
      const t = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      to = t.toISOString().split("T")[0]
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

  const handleSyncYardi = async () => {
    try {
      // show global sync overlay
      setSyncing(true)
      setSyncMessage("Loading from Yardi...")
      toast({ title: 'Starting sync from Yardi...', duration: 2000 })
      setLoadingExpenses(true)
      setLoadingRent(true)

      // Sync both bills and receipts from Yardi to QuickBooks
      const [billsSync, receiptsSync] = await Promise.all([
        DataService.syncYardiToQuickBooks('bills', 'chabot'),
        DataService.syncYardiToQuickBooks('receipts', 'chabot')
      ])
      
      // Check results for both syncs
      const getCount = (resp: any) => {
        if (!resp) return 0
        if (typeof resp.recordsProcessed === 'number') return resp.recordsProcessed
        if (typeof resp.processed === 'number') return resp.processed
        if (typeof resp.count === 'number') return resp.count
        if (Array.isArray(resp.records)) return resp.records.length
        if (resp.success === true) return 1
        return 0
      }

      const billsCount = getCount(billsSync)
      const receiptsCount = getCount(receiptsSync)
      const totalRecords = billsCount + receiptsCount

      const isFail = (resp: any) => {
        if (!resp) return false
        const s = String(resp.status || resp.state || resp.result || '').toLowerCase()
        return s === 'failed' || s === 'error' || s === 'failed_synchronization'
      }

      const billsFailed = isFail(billsSync)
      const receiptsFailed = isFail(receiptsSync)

      if (billsFailed && receiptsFailed) {
        toast({ 
          title: 'Yardi sync failed', 
          description: 'Both bills and receipts sync failed',
          duration: 4000 
        })
      } else if (billsFailed || receiptsFailed) {
        const parts: string[] = []
        if (!billsFailed && billsCount > 0) parts.push(`Bills (${billsCount} records)`)
        if (!receiptsFailed && receiptsCount > 0) parts.push(`Receipts (${receiptsCount} records)`)
        toast({ 
          title: 'Partial sync completed', 
          description: parts.length ? `${parts.join(' and ')} completed; some parts failed` : 'Some parts failed during sync',
          duration: 4000 
        })
      } else if (totalRecords > 0) {
        const parts: string[] = []
        if (billsCount > 0) parts.push(`Bills (${billsCount} records)`)
        if (receiptsCount > 0) parts.push(`Receipts (${receiptsCount} records)`)
        toast({ 
          title: 'Yardi sync completed successfully', 
          description: `Synced ${parts.join(' and ')}. Total: ${totalRecords} records`,
          duration: 3000 
        })
        // record the last successful sync time
        const successTime = new Date().toISOString()
        setLastYardiSync(successTime)
        try { localStorage.setItem('lastYardiSync', successTime) } catch (e) {}
      } else {
        toast({ 
          title: 'Yardi sync in progress', 
          description: 'Sync operations are still running',
          duration: 3000 
        })
      }

      // Refresh the data
      await loadExpenses()
      await loadRentPayments()
    } catch (error) {
      console.error('Yardi sync error:', error)
      toast({ 
        title: 'Yardi sync error', 
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 4000 
      })
    } finally {
      setLoadingExpenses(false)
      setLoadingRent(false)
      // hide global sync overlay
      setSyncing(false)
      setSyncMessage("")
    }
  }

  const handleSyncQuickBooks = async () => {
    try {
      // show global sync overlay
      setSyncing(true)
      setSyncMessage("Loading from QuickBooks...")
      // Check authentication status first
      const authStatus = await DataService.getAuthStatus()
      
      if (!authStatus.authenticated) {
        // Initiate OAuth flow
        const authUrl = await DataService.initiateQuickBooksAuth('sandbox')
        window.open(authUrl, '_blank', 'width=600,height=700')
        toast({ title: 'Opened QuickBooks connect window', duration: 3000 })
        // If auth window opened, stop the overlay so user can interact if needed
        setSyncing(false)
        setSyncMessage("")
        return
      }

      // If authenticated, sync QuickBooks to Yardi
      toast({ title: 'Starting sync from QuickBooks...', duration: 2000 })
      setLoadingExpenses(true)
      setLoadingRent(true)

      // Get date range for sync
      const { from, to } = getDateRange()
      
      const syncOperation = await DataService.syncQuickBooksToYardi('all', from, to, 'DEFAULT')
      
      if (syncOperation.status === 'completed') {
        toast({ 
          title: 'QuickBooks sync completed successfully', 
          description: `Processed ${syncOperation.recordsProcessed || 0} records`,
          duration: 3000 
        })
        const successTime = new Date().toISOString()
        setLastQuickBooksSync(successTime)
        try { localStorage.setItem('lastQuickBooksSync', successTime) } catch (e) {}
      } else if (syncOperation.status === 'failed') {
        toast({ 
          title: 'QuickBooks sync failed', 
          description: syncOperation.message,
          duration: 4000 
        })
      } else {
        toast({ 
          title: 'QuickBooks sync in progress', 
          description: syncOperation.message,
          duration: 3000 
        })
      }

      // Refresh the data
      await loadExpenses()
      await loadRentPayments()
    } catch (error) {
      console.error('QuickBooks sync error:', error)
      toast({ 
        title: 'QuickBooks sync error', 
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 4000 
      })
    } finally {
      setLoadingExpenses(false)
      setLoadingRent(false)
      // hide global sync overlay
      setSyncing(false)
      setSyncMessage("")
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
    <div className="relative">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-1">QuickBooks data synced from approved transactions</p>
          </div>

          <div className="mt-2 sm:mt-0 flex items-center gap-6">
            <div className="flex flex-col items-center">
              <Button size="sm" variant="outline" onClick={handleSyncYardi} disabled={syncing}>
                Sync from Yardi<Image src="/Yardi.svg" alt="Yardi"  className="object-contain" priority width={20} height={20}/>
              </Button>
              <div className="relative mt-1">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-500">{lastYardiSync ? `Last Sync: ${formatRelativeTime(lastYardiSync)}` : 'Never'}</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label="Show exact Yardi sync time"
                        className="p-1 rounded-sm text-neutral-400 hover:text-neutral-600"
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

            <div className="flex flex-col items-center">
              <Button size="sm" variant="outline" onClick={handleSyncQuickBooks} disabled={syncing}>
                Sync from Quickbooks<Image src="/quickbooks.svg" alt="QuickBooks"  className="object-contain" priority width={20} height={20}/>
              </Button>
              <div className="relative mt-1">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-neutral-500">{lastQuickBooksSync ? `Last Sync: ${formatRelativeTime(lastQuickBooksSync)}` : 'Never'}</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label="Show exact QuickBooks sync time"
                        className="p-1 rounded-sm text-neutral-400 hover:text-neutral-600"
                        type="button"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6} >
                      {lastQuickBooksSync ? formatShortTimestamp(lastQuickBooksSync) : 'Never'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-medium text-neutral-900">Expenses (Vendor Bills)</h2>
              <div className="flex items-center gap-3">
                {/* Date pickers to choose the range for the table */}
                <div className="flex gap-2">
                  <label className="flex flex-col text-sm">
                    <span className="text-neutral-500 text-xs">From</span>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-auto rounded-md border border-neutral-200 px-2 py-1 bg-white text-sm"
                      aria-label="Expenses from date (YYYY-MM-DD)"
                      style={{ textTransform: "none" }}
                    />
                  </label>
                  <div className="text-neutral-400 self-center">—</div>
                  <label className="flex flex-col text-sm">
                    <span className="text-neutral-500 text-xs">To</span>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-auto rounded-md border border-neutral-200 px-2 py-1 bg-white text-sm"
                      aria-label="Expenses to date (YYYY-MM-DD)"
                      style={{ textTransform: "none" }}
                    />
                  </label>
                </div>
                <div className="relative w-64 top-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="Search..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="pl-9"
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
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      Loading...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      No expenses found
                    </td>
                  </tr>
                ) : (
                  // show only the current page of expenses
                  expenses
                    .slice(expensePage * PAGE_SIZE, expensePage * PAGE_SIZE + PAGE_SIZE)
                    .map((expense) => (
                    <tr key={expense.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-900">{expense.vendorName}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{expense.docNumber}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(expense.dueDate)}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900 text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={getStatusColor(expense.status)}>
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
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
            <div className="text-sm text-neutral-500">
              Showing {expenses.length === 0 ? 0 : expensePage * PAGE_SIZE + 1} - {Math.min(expenses.length, (expensePage + 1) * PAGE_SIZE)} of {expenses.length}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setExpensePage((p) => Math.max(0, p - 1))} disabled={expensePage === 0}>
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
                >
                  {p + 1}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => setExpensePage((p) => Math.min(expenseTotalPages - 1, p + 1))} disabled={expensePage >= expenseTotalPages - 1}>
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Rent Payments Section */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-medium text-neutral-900">Rent Payments</h2>
              <div className="flex items-center gap-3">
                {/* Same date pickers used for rent payments */}
                <div className="flex items-end gap-3">
                  <label className="flex flex-col text-sm">
                    <span className="text-neutral-500 text-xs">From</span>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-auto rounded-md border border-neutral-200 px-2 py-1 bg-white text-sm"
                      aria-label="Rent from date (YYYY-MM-DD)"
                      style={{ textTransform: "none" }}
                    />
                  </label>
                  <div className="text-neutral-400 self-center">—</div>
                  <label className="flex flex-col text-sm">
                    <span className="text-neutral-500 text-xs">To</span>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-auto rounded-md border border-neutral-200 px-2 py-1 bg-white text-sm"
                      aria-label="Rent to date (YYYY-MM-DD)"
                      style={{ textTransform: "none" }}
                    />
                  </label>
                </div>
                <div className="relative w-64 top-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <Input
                    placeholder="Search..."
                    value={rentSearch}
                    onChange={(e) => setRentSearch(e.target.value)}
                    className="pl-9"
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
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      Loading...
                    </td>
                  </tr>
                ) : rentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      No rent payments found
                    </td>
                  </tr>
                ) : (
                  // show only the current page of rent payments
                  rentPayments
                    .slice(rentPage * PAGE_SIZE, rentPage * PAGE_SIZE + PAGE_SIZE)
                    .map((payment) => (
                    <tr key={payment.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-900">{payment.tenantName}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(payment.paymentDate)}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900 text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{payment.reference}</td>
                      <td className="px-6 py-4">
                        {payment.appliedInvoice ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
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
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
            <div className="text-sm text-neutral-500">
              Showing {rentPayments.length === 0 ? 0 : rentPage * PAGE_SIZE + 1} - {Math.min(rentPayments.length, (rentPage + 1) * PAGE_SIZE)} of {rentPayments.length}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setRentPage((p) => Math.max(0, p - 1))} disabled={rentPage === 0}>
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
                >
                  {p + 1}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={() => setRentPage((p) => Math.min(rentTotalPages - 1, p + 1))} disabled={rentPage >= rentTotalPages - 1}>
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay that blocks interaction and blurs page while syncing */}
      {syncing && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/60 pointer-events-auto"
        >
          <div className="flex items-center gap-4 bg-white/80 rounded-md p-4 shadow">
            <div className="w-8 h-8 border-4 border-t-blue-600 border-neutral-200 rounded-full animate-spin" />
            <div>
              <div className="text-lg font-medium text-neutral-900">{syncMessage}</div>
              <div className="text-sm text-neutral-600">Please wait…</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
