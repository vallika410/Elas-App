"use client"

import { useState } from "react"
import type { PendingRow } from "@/lib/data-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"

interface EditRowPanelProps {
  row: PendingRow
  onClose: () => void
  onSave: (row: PendingRow) => void
  onSaveAndApprove: (row: PendingRow) => void
}

export function EditRowPanel({ row, onClose, onSave, onSaveAndApprove }: EditRowPanelProps) {
  const [fields, setFields] = useState(row.fields)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = (key: string, value: any) => {
    setFields((prev) => ({ ...prev, [key]: value }))
    // Clear error when field is updated
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (row.targetType === "Bill") {
      if (!fields.vendor) newErrors.vendor = "Vendor is required"
      if (!fields.docNumber) newErrors.docNumber = "Doc # is required"
      if (!fields.date) newErrors.date = "Date is required"
      if (!fields.amount || fields.amount <= 0) newErrors.amount = "Amount must be greater than 0"
    } else if (row.targetType === "Receive Payment") {
      if (!fields.customer) newErrors.customer = "Customer is required"
      if (!fields.date) newErrors.date = "Date is required"
      if (!fields.amount || fields.amount <= 0) newErrors.amount = "Amount must be greater than 0"
      if (!fields.reference) newErrors.reference = "Reference is required"
    } else if (row.targetType === "Journal Entry") {
      if (!fields.date) newErrors.date = "Date is required"
      if (!fields.lines || fields.lines.length < 2) newErrors.lines = "At least 2 lines required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validate()) {
      const updatedRow = {
        ...row,
        fields,
        status: "valid" as const,
      }
      onSave(updatedRow)
    }
  }

  const handleSaveAndApprove = () => {
    if (validate()) {
      const updatedRow = {
        ...row,
        fields,
        status: "valid" as const,
      }
      onSaveAndApprove(updatedRow)
    }
  }

  const renderBillFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vendor">Vendor *</Label>
        <Input
          id="vendor"
          value={fields.vendor || ""}
          onChange={(e) => updateField("vendor", e.target.value)}
          className={errors.vendor ? "border-red-500" : ""}
        />
        {errors.vendor && <p className="text-sm text-red-600">{errors.vendor}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="docNumber">Doc # *</Label>
        <Input
          id="docNumber"
          value={fields.docNumber || ""}
          onChange={(e) => updateField("docNumber", e.target.value)}
          className={errors.docNumber ? "border-red-500" : ""}
        />
        {errors.docNumber && <p className="text-sm text-red-600">{errors.docNumber}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          type="date"
          value={fields.date || ""}
          onChange={(e) => updateField("date", e.target.value)}
          className={errors.date ? "border-red-500" : ""}
        />
        {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={fields.amount || ""}
          onChange={(e) => updateField("amount", Number.parseFloat(e.target.value))}
          className={errors.amount ? "border-red-500" : ""}
        />
        {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="class">Class/Location</Label>
        <Select value={fields.class || ""} onValueChange={(value) => updateField("class", value)}>
          <SelectTrigger id="class">
            <SelectValue placeholder="Select class/location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Property A">Property A</SelectItem>
            <SelectItem value="Property B">Property B</SelectItem>
            <SelectItem value="Property C">Property C</SelectItem>
            <SelectItem value="Corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">Memo</Label>
        <Textarea id="memo" value={fields.memo || ""} onChange={(e) => updateField("memo", e.target.value)} rows={2} />
      </div>
    </div>
  )

  const renderReceivePaymentFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Customer *</Label>
        <Input
          id="customer"
          value={fields.customer || ""}
          onChange={(e) => updateField("customer", e.target.value)}
          className={errors.customer ? "border-red-500" : ""}
        />
        {errors.customer && <p className="text-sm text-red-600">{errors.customer}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <Input
          id="date"
          type="date"
          value={fields.date || ""}
          onChange={(e) => updateField("date", e.target.value)}
          className={errors.date ? "border-red-500" : ""}
        />
        {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={fields.amount || ""}
          onChange={(e) => updateField("amount", Number.parseFloat(e.target.value))}
          className={errors.amount ? "border-red-500" : ""}
        />
        {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reference *</Label>
        <Input
          id="reference"
          value={fields.reference || ""}
          onChange={(e) => updateField("reference", e.target.value)}
          className={errors.reference ? "border-red-500" : ""}
        />
        {errors.reference && <p className="text-sm text-red-600">{errors.reference}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="appliedInvoice">Applied Invoice</Label>
        <Input
          id="appliedInvoice"
          value={fields.appliedInvoice || ""}
          onChange={(e) => updateField("appliedInvoice", e.target.value)}
          placeholder="Optional"
        />
      </div>
    </div>
  )

  const renderJournalEntryFields = () => {
    const lines = fields.lines || [
      { account: "", debit: 0, credit: 0, memo: "" },
      { account: "", debit: 0, credit: 0, memo: "" },
    ]

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={fields.date || ""}
            onChange={(e) => updateField("date", e.target.value)}
            className={errors.date ? "border-red-500" : ""}
          />
          {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
        </div>

        <div className="space-y-3">
          <Label>Lines *</Label>
          {lines.map((line: any, index: number) => (
            <div key={index} className="p-3 border border-neutral-200 rounded-md space-y-2">
              <Input
                placeholder="Account"
                value={line.account}
                onChange={(e) => {
                  const newLines = [...lines]
                  newLines[index].account = e.target.value
                  updateField("lines", newLines)
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Debit"
                  value={line.debit || ""}
                  onChange={(e) => {
                    const newLines = [...lines]
                    newLines[index].debit = Number.parseFloat(e.target.value) || 0
                    newLines[index].credit = 0
                    updateField("lines", newLines)
                  }}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Credit"
                  value={line.credit || ""}
                  onChange={(e) => {
                    const newLines = [...lines]
                    newLines[index].credit = Number.parseFloat(e.target.value) || 0
                    newLines[index].debit = 0
                    updateField("lines", newLines)
                  }}
                />
              </div>
              <Input
                placeholder="Memo"
                value={line.memo || ""}
                onChange={(e) => {
                  const newLines = [...lines]
                  newLines[index].memo = e.target.value
                  updateField("lines", newLines)
                }}
              />
            </div>
          ))}
          {errors.lines && <p className="text-sm text-red-600">{errors.lines}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
      <div className="bg-white h-full w-full max-w-md shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Edit {row.targetType}</h2>
            <p className="text-sm text-neutral-500 mt-1">Update the fields below</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {row.targetType === "Bill" && renderBillFields()}
          {row.targetType === "Receive Payment" && renderReceivePaymentFields()}
          {row.targetType === "Journal Entry" && renderJournalEntryFields()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex gap-3">
          <Button variant="outline" onClick={handleSave} className="flex-1 bg-transparent">
            Save
          </Button>
          <Button onClick={handleSaveAndApprove} className="flex-1">
            Approve
          </Button>
        </div>
      </div>
    </div>
  )
}
