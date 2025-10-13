// Data service integrated with real APIs
// Types are QBO-shaped and match backend API models

import { 
  AuthApi, 
  YardiToQbApi, 
  QbToYardiApi, 
  ApiUtils,
  type SyncRequest,
  type QBToYardiRequest,
  type SyncResponse,
  type AuthStatusResponse,
  ApiError
} from './api-service'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

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

// Sync operation types
export type SyncOperation = {
  id: string
  type: 'yardi_to_qb' | 'qb_to_yardi'
  status: 'init' | 'in_progress' | 'completed' | 'failed'
  message: string
  timestamp: string
  recordsProcessed?: number
  outputFiles?: string[]
  errors?: string[]
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
  // Authentication methods
  static async getAuthStatus(): Promise<AuthStatusResponse> {
    try {
      return await AuthApi.getAuthStatus()
    } catch (error) {
      console.error('Failed to get auth status:', error)
      // Return default unauthenticated status
      return {
        authenticated: false,
        environment: 'sandbox',
        message: 'Not authenticated',
        timestamp: new Date().toISOString()
      }
    }
  }

  static async initiateQuickBooksAuth(environment: string = 'sandbox'): Promise<string> {
    try {
      const response = await AuthApi.initiateOAuth(environment)
      return response.auth_url
    } catch (error) {
      console.error('Failed to initiate OAuth:', error)
      throw new Error('Failed to initiate QuickBooks authentication')
    }
  }

  static async handleOAuthCallback(code: string, state: string, realmId: string): Promise<boolean> {
    try {
      const response = await AuthApi.exchangeCode(code, state, realmId)
      return response.success
    } catch (error) {
      console.error('Failed to handle OAuth callback:', error)
      return false
    }
  }

  // Sync operations
  static async syncYardiToQuickBooks(
    dataType: 'bills' | 'receipts' | 'bill_payments' | 'customer_payments' | 'all' = 'bills',
    propertyCode: string = 'chabot'
  ): Promise<SyncOperation> {
    try {
      const request: SyncRequest = {
        data_type: dataType,
        property_code: propertyCode,
        source_system: 'yardi',
        target_system: 'quickbooks'
      }
      
      const response = await YardiToQbApi.syncYardiToQb(request)
      
      return {
        id: response.sync_id,
        type: 'yardi_to_qb',
        status: response.status,
        message: response.message,
        timestamp: response.timestamp,
        recordsProcessed: response.records_processed,
        outputFiles: response.output_files,
        errors: response.errors
      }
    } catch (error) {
      console.error('Failed to sync Yardi to QuickBooks:', error)
      throw new Error('Failed to sync data from Yardi to QuickBooks')
    }
  }

  static async syncQuickBooksToYardi(
    dataType: 'bills' | 'receipts' | 'bill_payments' | 'customer_payments' | 'all' = 'all',
    startDate?: string,
    endDate?: string,
    propertyCode: string = 'DEFAULT'
  ): Promise<SyncOperation> {
    try {
      const request: QBToYardiRequest = {
        data_type: dataType,
        start_date: startDate,
        end_date: endDate,
        property_code: propertyCode,
        output_dir: 'data/output'
      }
      
      const response = await QbToYardiApi.syncQbToYardi(request)
      
      return {
        id: response.sync_id,
        type: 'qb_to_yardi',
        status: response.status,
        message: response.message,
        timestamp: response.timestamp,
        recordsProcessed: response.records_processed,
        outputFiles: response.output_files,
        errors: response.errors
      }
    } catch (error) {
      console.error('Failed to sync QuickBooks to Yardi:', error)
      throw new Error('Failed to sync data from QuickBooks to Yardi')
    }
  }

  static async getSyncStatus(syncId: string, type: 'yardi_to_qb' | 'qb_to_yardi'): Promise<SyncOperation> {
    try {
      const response = type === 'yardi_to_qb' 
        ? await YardiToQbApi.getSyncStatus(syncId)
        : await QbToYardiApi.getSyncStatus(syncId)
      
      return {
        id: response.sync_id,
        type,
        status: response.status,
        message: response.message,
        timestamp: response.timestamp,
        recordsProcessed: response.records_processed,
        outputFiles: response.output_files,
        errors: response.errors
      }
    } catch (error) {
      console.error('Failed to get sync status:', error)
      throw new Error('Failed to get sync status')
    }
  }

  // Data fetching methods - now using real QuickBooks API
  static async fetchExpenseInvoices(params: {
    from?: string
    to?: string
    search?: string
  }): Promise<ExpenseInvoice[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params.from) queryParams.append('from_date', params.from)
      if (params.to) queryParams.append('to_date', params.to)
      if (params.search) queryParams.append('search', params.search)

      const response = await fetch(`${API_BASE_URL}/data/expense-invoices?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch expense invoices: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching expense invoices:', error)
      // Fallback to mock data if API fails
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
  }

  static async fetchRentPayments(params: {
    from?: string
    to?: string
    search?: string
  }): Promise<RentPayment[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params.from) queryParams.append('from_date', params.from)
      if (params.to) queryParams.append('to_date', params.to)
      if (params.search) queryParams.append('search', params.search)

      const response = await fetch(`${API_BASE_URL}/data/rent-payments?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch rent payments: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching rent payments:', error)
      // Fallback to mock data if API fails
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
  }

  static async fetchPendingBatch(): Promise<PendingBatch> {
    // TODO: Replace with real API call when backend provides this endpoint
    // For now, use mock data but simulate API delay
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

  // Health check
  static async healthCheck(): Promise<{ status: string; timestamp: string; services: any }> {
    try {
      return await ApiUtils.healthCheck()
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: { error: 'API unavailable' }
      }
    }
  }
}
