// API service layer for integrating with the backend APIs
// This replaces the mock data service with real API calls

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

// Types matching the backend API models
export type DataType = 'bills' | 'receipts' | 'bill_payments' | 'customer_payments' | 'all'
export type SyncDirection = 'yardi_to_qb' | 'qb_to_yardi'
export type SyncStatus = 'init' | 'in_progress' | 'completed' | 'failed'

export interface SyncRequest {
  data_type: DataType
  property_code: string
  source_system: string
  target_system: string
}

export interface QBToYardiRequest {
  data_type: DataType
  start_date?: string
  end_date?: string
  property_code: string
  output_dir: string
}

export interface SyncResponse {
  success: boolean
  sync_id: string
  status: SyncStatus
  message: string
  timestamp: string
  records_processed?: number
  output_files?: string[]
  schema_confidence?: number
  validation_quality?: number
  ai_insights?: string[]
  errors?: string[]
}

export interface AuthStatusResponse {
  authenticated: boolean
  environment: string
  realm_id?: string
  token_expires_at?: string
  message: string
  timestamp: string
}

export interface AuthResponse {
  success: boolean
  auth_url: string
  state: string
  message: string
  timestamp: string
}

export interface TokenResponse {
  success: boolean
  access_token?: string
  refresh_token?: string
  expires_in?: number
  realm_id?: string
  message: string
  timestamp: string
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Base API client
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorBody = await response.text()
        throw new ApiError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorBody
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      )
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create API client instance
const apiClient = new ApiClient()

// Authentication API
export class AuthApi {
  static async getAuthStatus(): Promise<AuthStatusResponse> {
    return apiClient.get<AuthStatusResponse>('/auth/status')
  }

  static async initiateOAuth(environment: string = 'sandbox'): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/initiate', {
      environment,
      redirect_uri: window.location.origin + '/auth/callback'
    })
  }

  static async exchangeCode(code: string, state: string, realmId: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      code,
      state,
      realmId,
      // CRITICAL: Pass the frontend redirect URI to backend so it uses the correct URI for token exchange
      redirect_uri: window.location.origin + '/auth/callback'
    })
    return apiClient.get<TokenResponse>(`/auth/callback?${params}`)
  }

  static async refreshToken(): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/auth/refresh')
  }

  static async redirectToOAuth(environment: string = 'sandbox'): Promise<{ redirect_url: string }> {
    const params = new URLSearchParams({
      environment,
      redirect_uri: window.location.origin + '/auth/callback'
    })
    return apiClient.get<{ redirect_url: string }>(`/auth/redirect?${params}`)
  }

  static async disconnect(): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/disconnect')
  }
}

// Yardi to QuickBooks API
export class YardiToQbApi {
  static async syncYardiToQb(request: SyncRequest): Promise<SyncResponse> {
    return apiClient.post<SyncResponse>('/sync/yardi-to-qb', request)
  }

  static async getSyncStatus(syncId: string): Promise<SyncResponse> {
    return apiClient.get<SyncResponse>(`/sync/yardi-to-qb/${syncId}/status`)
  }

  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return apiClient.get<{ status: string; timestamp: string }>('/sync/yardi-to-qb/health')
  }
}

// QuickBooks to Yardi API
export class QbToYardiApi {
  static async syncQbToYardi(request: QBToYardiRequest): Promise<SyncResponse> {
    return apiClient.post<SyncResponse>('/sync/qb-to-yardi', request)
  }

  static async syncQbToYardiImmediate(request: QBToYardiRequest): Promise<SyncResponse> {
    return apiClient.post<SyncResponse>('/sync/qb-to-yardi/sync', request)
  }

  static async getSyncStatus(syncId: string): Promise<SyncResponse> {
    return apiClient.get<SyncResponse>(`/sync/qb-to-yardi/${syncId}/status`)
  }

  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return apiClient.get<{ status: string; timestamp: string }>('/sync/qb-to-yardi/health')
  }
}

// QuickBooks Data API
export interface ExpenseInvoice {
  id: string
  vendorName: string
  docNumber: string
  dueDate: string
  amount: number
  status: 'open' | 'paid' | 'overdue'
}

export interface RentPayment {
  id: string
  tenantName: string
  paymentDate: string
  amount: number
  reference: string
  appliedInvoice?: string
}

export interface DataFetchResponse<T> {
  success: boolean
  data: T[]
  count: number
  timestamp: string
}

export class QuickBooksDataApi {
  static async fetchExpenseInvoices(params: {
    from_date?: string
    to_date?: string
    search?: string
  }): Promise<DataFetchResponse<ExpenseInvoice>> {
    const queryParams = new URLSearchParams()
    if (params.from_date) queryParams.append('from_date', params.from_date)
    if (params.to_date) queryParams.append('to_date', params.to_date)
    if (params.search) queryParams.append('search', params.search)
    
    return apiClient.get<DataFetchResponse<ExpenseInvoice>>(
      `/data/expense-invoices?${queryParams}`
    )
  }

  static async fetchRentPayments(params: {
    from_date?: string
    to_date?: string
    search?: string
  }): Promise<DataFetchResponse<RentPayment>> {
    const queryParams = new URLSearchParams()
    if (params.from_date) queryParams.append('from_date', params.from_date)
    if (params.to_date) queryParams.append('to_date', params.to_date)
    if (params.search) queryParams.append('search', params.search)
    
    return apiClient.get<DataFetchResponse<RentPayment>>(
      `/data/rent-payments?${queryParams}`
    )
  }
}

// General API utilities
export class ApiUtils {
  static async healthCheck(): Promise<{ status: string; timestamp: string; services: any }> {
    return apiClient.get<{ status: string; timestamp: string; services: any }>('/health')
  }

  static async getRoot(): Promise<{ message: string; version: string; status: string; timestamp: string }> {
    return apiClient.get<{ message: string; version: string; status: string; timestamp: string }>('/')
  }
}

// Export the API client for custom requests
export { apiClient }
