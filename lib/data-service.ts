// Data service with stubbed responses for QuickBooks data
// Types are QBO-shaped so we can swap in real API later

export type ExpenseInvoice = {
  id: string
  vendorName: string
  docNumber: string
  dueDate: string
  amount: number
  status: "open" | "paid" | "overdue"
}

export type RentPayment = {
  id: string
  tenantName: string
  paymentDate: string
  amount: number
  reference: string
  appliedInvoice?: string
}

export type PendingRowTargetType = "Bill" | "Receive Payment" | "Journal Entry"

export type PendingRowStatus = "valid" | "error"

export type PendingRow = {
  id: string
  targetType: PendingRowTargetType
  fields: Record<string, any>
  status: PendingRowStatus
}

export type PendingBatch = {
  id: string
  rows: PendingRow[]
}

// Stub data
const mockExpenseInvoices: ExpenseInvoice[] = [
  {
    id: "bill-001",
    vendorName: "ABC Property Services",
    docNumber: "INV-2024-001",
    dueDate: "2025-10-15",
    amount: 2500.0,
    status: "open",
  },
  {
    id: "bill-002",
    vendorName: "City Utilities Co",
    docNumber: "UTIL-9876",
    dueDate: "2025-10-10",
    amount: 450.75,
    status: "overdue",
  },
  {
    id: "bill-003",
    vendorName: "Maintenance Plus LLC",
    docNumber: "MP-2024-Q3",
    dueDate: "2025-10-20",
    amount: 1200.0,
    status: "open",
  },
  {
    id: "bill-004",
    vendorName: "Insurance Group",
    docNumber: "POL-88234",
    dueDate: "2025-09-30",
    amount: 3500.0,
    status: "paid",
  },
  {
    id: "bill-005",
    vendorName: "Landscaping Services",
    docNumber: "LS-OCT-2024",
    dueDate: "2025-10-25",
    amount: 850.0,
    status: "open",
  },
]

const mockRentPayments: RentPayment[] = [
  {
    id: "pmt-001",
    tenantName: "John Smith",
    paymentDate: "2025-10-01",
    amount: 2000.0,
    reference: "ACH-10012024",
    appliedInvoice: "INV-1001",
  },
  {
    id: "pmt-002",
    tenantName: "Sarah Johnson",
    paymentDate: "2025-10-01",
    amount: 1800.0,
    reference: "CHECK-5432",
    appliedInvoice: "INV-1002",
  },
  {
    id: "pmt-003",
    tenantName: "Tech Startup Inc",
    paymentDate: "2025-09-28",
    amount: 4500.0,
    reference: "WIRE-092824",
  },
  {
    id: "pmt-004",
    tenantName: "Maria Garcia",
    paymentDate: "2025-10-02",
    amount: 1650.0,
    reference: "ACH-10022024",
    appliedInvoice: "INV-1004",
  },
  {
    id: "pmt-005",
    tenantName: "David Chen",
    paymentDate: "2025-09-30",
    amount: 2200.0,
    reference: "CHECK-7891",
    appliedInvoice: "INV-1005",
  },
]

export class DataService {
  static async fetchExpenseInvoices(params: {
    from?: string
    to?: string
    search?: string
  }): Promise<ExpenseInvoice[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    let results = [...mockExpenseInvoices]

    // Simple search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      results = results.filter(
        (inv) =>
          inv.vendorName.toLowerCase().includes(searchLower) || inv.docNumber.toLowerCase().includes(searchLower),
      )
    }

    return results
  }

  static async fetchRentPayments(params: {
    from?: string
    to?: string
    search?: string
  }): Promise<RentPayment[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    let results = [...mockRentPayments]

    // Simple search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      results = results.filter(
        (pmt) =>
          pmt.tenantName.toLowerCase().includes(searchLower) || pmt.reference.toLowerCase().includes(searchLower),
      )
    }

    return results
  }

  static async fetchPendingBatch(): Promise<PendingBatch> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    return {
      id: "batch-2024-10-01",
      rows: [
        {
          id: "row-001",
          targetType: "Bill",
          fields: {
            vendor: "Acme Supplies",
            docNumber: "ACM-2024-100",
            date: "2025-10-01",
            amount: 1500.0,
            class: "Property A",
            memo: "Monthly supplies",
          },
          status: "valid",
        },
        {
          id: "row-002",
          targetType: "Receive Payment",
          fields: {
            customer: "Jane Doe",
            date: "2025-10-01",
            amount: 1900.0,
            reference: "CHECK-9988",
            appliedInvoice: "INV-1010",
          },
          status: "valid",
        },
        {
          id: "row-003",
          targetType: "Bill",
          fields: {
            vendor: "",
            docNumber: "MISSING-VENDOR",
            date: "2025-10-01",
            amount: 500.0,
          },
          status: "error",
        },
        {
          id: "row-004",
          targetType: "Journal Entry",
          fields: {
            date: "2025-10-01",
            lines: [
              { account: "Undeposited Funds", debit: 250.0, memo: "Receipt mismatch" },
              { account: "Clearing Account", credit: 250.0, memo: "Receipt mismatch" },
            ],
          },
          status: "error",
        },
        {
          id: "row-005",
          targetType: "Receive Payment",
          fields: {
            customer: "Bob Wilson",
            date: "2025-10-02",
            amount: 2100.0,
            reference: "ACH-100224",
          },
          status: "valid",
        },
      ],
    }
  }
}
