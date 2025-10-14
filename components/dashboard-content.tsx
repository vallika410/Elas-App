"use client"

import { useState, useEffect } from "react"
import { DataService, type ExpenseInvoice, type RentPayment } from "@/lib/data-service"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type DateRange = "this-month" | "last-month"
import Image from "next/image"

export function DashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("elas-date-range") as DateRange) || "this-month"
    }
    return "this-month"
  })
  const [expenseSearch, setExpenseSearch] = useState("")
  const [rentSearch, setRentSearch] = useState("")
  const [expenses, setExpenses] = useState<ExpenseInvoice[]>([])
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [loadingRent, setLoadingRent] = useState(true)
  const { toast } = useToast()

  // New states to manage global sync overlay and message
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")

  useEffect(() => {
    loadExpenses()
  }, [expenseSearch, dateRange])

  useEffect(() => {
    loadRentPayments()
  }, [rentSearch, dateRange])

  const getDateRange = () => {
    const now = new Date()
    let from: Date, to: Date

    if (dateRange === "this-month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      to = new Date(now.getFullYear(), now.getMonth(), 0)
    }

    return {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    }
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
      const totalRecords = (billsSync.recordsProcessed || 0) + (receiptsSync.recordsProcessed || 0)
      const failedSyncs = []
      const completedSyncs = []
      
      if (billsSync.status === 'failed') {
        failedSyncs.push('Bills')
      } else if (billsSync.status === 'completed') {
        completedSyncs.push(`Bills (${billsSync.recordsProcessed || 0} records)`)
      }
      
      if (receiptsSync.status === 'failed') {
        failedSyncs.push('Receipts')
      } else if (receiptsSync.status === 'completed') {
        completedSyncs.push(`Receipts (${receiptsSync.recordsProcessed || 0} records)`)
      }
      
      // Show appropriate toast message
      if (failedSyncs.length === 2) {
        toast({ 
          title: 'Yardi sync failed', 
          description: 'Both bills and receipts sync failed',
          duration: 4000 
        })
      } else if (failedSyncs.length === 1) {
        toast({ 
          title: 'Partial sync completed', 
          description: `${failedSyncs[0]} sync failed, but ${completedSyncs.join(' and ')} completed successfully`,
          duration: 4000 
        })
      } else if (completedSyncs.length === 2) {
        toast({ 
          title: 'Yardi sync completed successfully', 
          description: `Synced ${completedSyncs.join(' and ')}. Total: ${totalRecords} records`,
          duration: 3000 
        })
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

  return (
    <div className="relative">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-1">QuickBooks data synced from approved transactions</p>
          </div>

          <div className="mt-2 sm:mt-0 flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleSyncYardi} disabled={syncing}>
              Sync from <Image src="/Yardi.svg" alt="Yardi"  className="object-contain" priority width={20} height={20}/>
            </Button>
            <Button size="sm" variant="outline" onClick={handleSyncQuickBooks} disabled={syncing}>
              Sync from <Image src="/quickbooks.svg" alt="QuickBooks"  className="object-contain" priority width={20} height={20}/>
            </Button>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-medium text-neutral-900">Expenses (Vendor Bills)</h2>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <Button
                    variant={dateRange === "this-month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("this-month")}
                  >
                    This month
                  </Button>
                  <Button
                    variant={dateRange === "last-month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("last-month")}
                  >
                    Last month
                  </Button>
                </div>
                <div className="relative w-64">
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
                  expenses.map((expense) => (
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
        </div>

        {/* Rent Payments Section */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-medium text-neutral-900">Rent Payments</h2>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <Button
                    variant={dateRange === "this-month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("this-month")}
                  >
                    This month
                  </Button>
                  <Button
                    variant={dateRange === "last-month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange("last-month")}
                  >
                    Last month
                  </Button>
                </div>
                <div className="relative w-64">
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
                  rentPayments.map((payment) => (
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
        </div>
      </div>

      {/* Overlay that blocks interaction and blurs page while syncing */}
      {syncing && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/60 pointer-events-auto"
         // aria-hidden={syncing ? "true" : "false"}
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