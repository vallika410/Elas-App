"use client"

import { useState, useEffect } from "react"
import { DataService, type ExpenseInvoice, type RentPayment } from "@/lib/data-service"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type DateRange = "this-month" | "last-month"

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
    // If Yardi is not connected, open the Yardi connect URL (or simulate)
    const yardConnected = localStorage.getItem('elas-yard-connected') === 'true'
    const authUrl = process.env.NEXT_PUBLIC_YARDI_AUTH_URL || ''

    if (!yardConnected) {
      if (authUrl) {
        window.open(authUrl, '_blank', 'width=600,height=700')
        toast({ title: 'Opened Yardi connect window', duration: 3000 })
        return
      }

      // Fallback/demo: simulate connect and mark as connected
      localStorage.setItem('elas-yard-connected', 'true')
      toast({ title: 'Connected to Yardi (demo)', duration: 2000 })
    }

    toast({ title: 'Starting sync from Yardi...', duration: 2000 })
    setLoadingExpenses(true)
    setLoadingRent(true)
    // TODO: replace with real server-side sync endpoint when available
    await new Promise((r) => setTimeout(r, 800))
    await loadExpenses()
    await loadRentPayments()
    toast({ title: 'Yardi sync complete.', duration: 2000 })
  }

  const handleSyncQuickBooks = async () => {
    // If QuickBooks is not connected, open the QB OAuth flow (or simulate)
    const qbConnected = localStorage.getItem('elas-qb-connected') === 'true'
    const qbAuthUrl = process.env.NEXT_PUBLIC_QB_AUTH_URL || ''

    if (!qbConnected) {
      if (qbAuthUrl) {
        window.open(qbAuthUrl, '_blank', 'width=600,height=700')
        toast({ title: 'Opened QuickBooks connect window', duration: 3000 })
        return
      }

      // Fallback/demo: simulate a connected account
      const demoName = 'Demo QuickBooks Account'
      localStorage.setItem('elas-qb-connected', 'true')
      localStorage.setItem('elas-qb-account', demoName)
      setLoadingExpenses(true)
      setLoadingRent(true)
      toast({ title: 'Connected to QuickBooks (demo)', description: demoName, duration: 2000 })
      await loadExpenses()
      await loadRentPayments()
      toast({ title: 'QuickBooks sync complete.', duration: 2000 })
      return
    }

    // If connected, call the server proxy to fetch fresh data from QuickBooks
    try {
      toast({ title: 'Starting sync from QuickBooks...', duration: 2000 })
      setLoadingExpenses(true)
      setLoadingRent(true)

      const query = 'SELECT * FROM Bill STARTPOSITION 1 MAXRESULTS 20'
      const res = await fetch('/api/quickbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok) {
        const msg = json?.message || 'QuickBooks sync failed'
        toast({ title: 'QuickBooks sync failed', description: String(msg), duration: 4000 })
      } else {
        // Provide lightweight feedback. Mapping QBO -> app models is a separate step.
        const count = json?.data?.QueryResponse?.Bill?.length ?? 0
        toast({ title: 'QuickBooks sync finished', description: `${count} bills fetched`, duration: 3000 })
      }

      // Refresh UI (data-service still returns mock data unless adapted)
      await loadExpenses()
      await loadRentPayments()
    } catch (err: any) {
      console.error('QuickBooks sync error', err)
      toast({ title: 'QuickBooks sync error', description: String(err?.message || err), duration: 4000 })
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">QuickBooks data synced from approved transactions</p>
        </div>

        <div className="mt-2 sm:mt-0 flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={handleSyncYardi}>
            Sync from Yardi
          </Button>
          <Button size="sm" variant="outline" onClick={handleSyncQuickBooks}>
            Sync from QuickBooks
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
  )
}
