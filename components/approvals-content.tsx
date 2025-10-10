"use client"

import { useState, useEffect } from "react"
import { DataService, type PendingRow, type PendingRowStatus } from "@/lib/data-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { EditRowPanel } from "@/components/edit-row-panel"
import { useToast } from "@/hooks/use-toast"

type FilterType = "all" | "valid" | "error"

export function ApprovalsContent() {
  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [editingRow, setEditingRow] = useState<PendingRow | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadBatch()
  }, [])

  const loadBatch = async () => {
    setLoading(true)
    const batch = await DataService.fetchPendingBatch()
    setRows(batch.rows)
    setLoading(false)
  }

  const filteredRows = rows.filter((row) => {
    if (filter === "all") return true
    return row.status === filter
  })

  const handleApprove = (rowId: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, status: "valid" as PendingRowStatus, approved: true } : row)),
    )
    toast({
      title: "Approved.",
      duration: 2000,
    })
  }

  const handleEdit = (row: PendingRow) => {
    setEditingRow(row)
  }

  const handleSaveEdit = (updatedRow: PendingRow) => {
    setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)))
    setEditingRow(null)
    toast({
      title: "Saved.",
      duration: 2000,
    })
  }

  const handleSaveAndApprove = (updatedRow: PendingRow) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === updatedRow.id ? { ...updatedRow, status: "valid" as PendingRowStatus, approved: true } : row,
      ),
    )
    setEditingRow(null)
    toast({
      title: "Approved.",
      duration: 2000,
    })
  }

  const getStatusColor = (status: PendingRowStatus) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-neutral-100 text-neutral-800"
    }
  }

  const renderKeyFields = (row: PendingRow) => {
    const { targetType, fields } = row

    switch (targetType) {
      case "Bill":
        return (
          <div className="text-sm text-neutral-600">
            {fields.vendor || "(no vendor)"} · {fields.docNumber} · {fields.date} · $
            {fields.amount?.toFixed(2) || "0.00"}
          </div>
        )
      case "Receive Payment":
        return (
          <div className="text-sm text-neutral-600">
            {fields.customer} · {fields.date} · ${fields.amount?.toFixed(2)} · {fields.reference}
          </div>
        )
      case "Journal Entry":
        const total = fields.lines?.[0]?.debit || fields.lines?.[0]?.credit || 0
        return (
          <div className="text-sm text-neutral-600">
            {fields.date} · ${total.toFixed(2)}
          </div>
        )
      default:
        return null
    }
  }

  const isApproved = (row: PendingRow) => {
    return (row as any).approved === true
  }

  const canApprove = (row: PendingRow) => {
    return row.status !== "error" && !isApproved(row)
  }

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Approvals</h1>

        {/* Filter Pills */}
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All
          </Button>
          <Button variant={filter === "valid" ? "default" : "outline"} size="sm" onClick={() => setFilter("valid")}>
            Valid
          </Button>
          <Button variant={filter === "error" ? "default" : "outline"} size="sm" onClick={() => setFilter("error")}>
            Errors
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Key Fields
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                      No rows found
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-neutral-900">{row.targetType}</span>
                      </td>
                      <td className="px-6 py-4">{renderKeyFields(row)}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={getStatusColor(row.status)}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isApproved(row) ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium">Approved</span>
                            </div>
                          ) : (
                            <>
                              {canApprove(row) && (
                                <Button size="sm" onClick={() => handleApprove(row.id)}>
                                  Approve
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
                                Edit
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {editingRow && (
        <EditRowPanel
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={handleSaveEdit}
          onSaveAndApprove={handleSaveAndApprove}
        />
      )}
    </>
  )
}
