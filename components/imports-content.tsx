"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type ImportBatch = {
  id: string
  items: number
  createdAt: string
}

// Mock data for import batches
const mockBatches: ImportBatch[] = [
  {
    id: "batch-2024-10-01",
    items: 5,
    createdAt: "2025-10-01T10:30:00Z",
  },
  {
    id: "batch-2024-09-28",
    items: 12,
    createdAt: "2025-09-28T14:15:00Z",
  },
  {
    id: "batch-2024-09-25",
    items: 8,
    createdAt: "2025-09-25T09:45:00Z",
  },
  {
    id: "batch-2024-09-20",
    items: 15,
    createdAt: "2025-09-20T16:20:00Z",
  },
]

export function ImportsContent() {
  const router = useRouter()
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setBatches(mockBatches)
      setLoading(false)
    }, 300)
  }, [])

  const handleOpenInApprovals = (batchId: string) => {
    // In a real app, this would set the active batch
    localStorage.setItem("active-batch", batchId)
    router.push("/approvals")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Imports</h1>

      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Batch ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                    Loading...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                    No import batches found
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">{batch.id}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{batch.items}</td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" onClick={() => handleOpenInApprovals(batch.id)}>
                        Open in Approvals
                      </Button>
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
