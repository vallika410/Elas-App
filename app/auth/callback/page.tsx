"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DataService } from "@/lib/data-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const realmId = searchParams.get('realmId')

        if (!code || !state || !realmId) {
          setStatus('error')
          setMessage('Missing required parameters from QuickBooks')
          return
        }

        // Exchange code for tokens
        const success = await DataService.handleOAuthCallback(code, state, realmId)
        
        if (success) {
          setStatus('success')
          setMessage('Successfully connected to QuickBooks!')
          
          // If this was opened as a popup, close it
          if (window.opener) {
            // Notify parent window (optional)
            window.opener.postMessage({ type: 'auth-success', realmId }, '*')
            
            // Close popup after a short delay
            setTimeout(() => {
              window.close()
            }, 2000)
          } else {
            // Normal redirect to dashboard
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
          }
        } else {
          setStatus('error')
          setMessage('Failed to complete QuickBooks authentication')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Unknown error occurred')
      }
    }

    handleCallback()
  }, [searchParams, router])

  const handleRetry = () => {
    router.push('/settings')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">QuickBooks Authentication</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Completing authentication...'}
            {status === 'success' && 'Authentication successful!'}
            {status === 'error' && 'Authentication failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-neutral-600">Please wait while we complete your authentication...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <p className="text-sm text-green-600">{message}</p>
              <p className="text-xs text-neutral-500">Redirecting to dashboard...</p>
              <Button onClick={handleGoToDashboard} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="w-8 h-8 text-red-500" />
              <p className="text-sm text-red-600">{message}</p>
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleGoToDashboard} className="flex-1">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
