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

export type BillPayment = {
  id: string
  vendorName: string
  checkNumber: string
  paymentDate: string
  amount: number
  reference: string
  bankAccount?: string
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

  static async disconnectQuickBooks(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await AuthApi.disconnect()
      return { success: response.success, error: response.message }
    } catch (error) {
      console.error('Failed to disconnect QuickBooks:', error)
      if (error instanceof ApiError) {
        // Try to parse error body if it's JSON
        let errorMessage = error.message
        try {
          if (error.body) {
            const errorBody = typeof error.body === 'string' ? JSON.parse(error.body) : error.body
            errorMessage = errorBody.detail || errorBody.message || error.body
          }
        } catch (parseError) {
          // If parsing fails, use the original error body
          errorMessage = error.body || error.message
        }
        
        // Check for specific backend errors and provide user-friendly messages
        if (errorMessage.includes("get_token_manager") || errorMessage.includes("not defined")) {
          errorMessage = "Backend service error. Please contact support or try again later."
        }
        
        return { 
          success: false, 
          error: error.status === 500 
            ? `Server error: ${errorMessage}` 
            : `API Error (${error.status}): ${errorMessage}` 
        }
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // Sync operations
  static async syncYardiToQuickBooks(
    dataType: 'bills' | 'receipts' | 'journals' | 'customer_payments' | 'bill_payments' = 'bills',
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
    dataType: 'bills' | 'receipts' | 'journals' | 'customer_payments' | 'bill_payments' = 'bills',
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
      // Return empty array if API fails - no mock data
      return []
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
      // Return empty array if API fails - no mock data
      return []
    }
  }

  static async fetchBillPayments(params: {
    from?: string
    to?: string
    search?: string
  }): Promise<BillPayment[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params.from) queryParams.append('from_date', params.from)
      if (params.to) queryParams.append('to_date', params.to)
      if (params.search) queryParams.append('search', params.search)

      const response = await fetch(`${API_BASE_URL}/data/bill-payments?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch bill payments: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching bill payments:', error)
      // Return empty array if API fails - no mock data
      return []
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
