"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface MakeScenario {
  id: string | number
  name: string
  status: string
  enabled: boolean
  blueprint: string
}

interface N8NWorkflow {
  id: string
  name: string
  active: boolean
  nodes: number
}

export function IntegrationsContent() {
  const { toast } = useToast()

  // N8N state
  const [n8nRunning, setN8nRunning] = useState(false)
  const [n8nWorkflows, setN8nWorkflows] = useState<N8NWorkflow[]>([])
  const [n8nLoading, setN8nLoading] = useState(false)
  const [n8nWebhookOverrideUrl, setN8nWebhookOverrideUrl] = useState<string>("")

  // Make.com state
  const [makeApiKey, setMakeApiKey] = useState("")
  const [makeConnected, setMakeConnected] = useState(false)
  const [makeScenarios, setMakeScenarios] = useState<MakeScenario[]>([])
  const [makeLoading, setMakeLoading] = useState(false)

  // Check N8N status on mount and periodically
  useEffect(() => {
    let isMounted = true
    // Load saved webhook override
    try {
      const saved = localStorage.getItem('n8n-webhook-override-url')
      if (saved) setN8nWebhookOverrideUrl(saved)
    } catch {}
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/n8n/start', { method: 'GET' })
        if (!isMounted) return
        if (res.ok) {
          const data = await res.json()
          setN8nRunning(Boolean(data.running))
        }
      } catch (_) {
        if (isMounted) setN8nRunning(false)
      }
    }

    checkStatus()
    const id = setInterval(checkStatus, 5000)
    return () => {
      isMounted = false
      clearInterval(id)
    }
  }, [])

  // N8N handlers
  const handleStartN8N = async () => {
    setN8nLoading(true)
    try {
      const response = await fetch("/api/n8n/start", { method: "POST" })
      const data = await response.json()

      if (response.ok) {
        setN8nRunning(true)
        toast({ title: "N8N Started", description: "Opening N8N instance...", duration: 2000 })
        window.open("http://localhost:5678", "n8n", "width=1200,height=800")
        setTimeout(async () => { await handleRefreshN8nWorkflows() }, 2000)
      } else {
        toast({ title: "Error", description: data.message || "Failed to start N8N", duration: 3000 })
      }
    } catch (error) {
      console.error("Error starting N8N:", error)
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to start N8N", duration: 3000 })
    } finally {
      setN8nLoading(false)
    }
  }

  const handleStopN8N = async () => {
    setN8nLoading(true)
    try {
      const response = await fetch("/api/n8n/stop", { method: "POST" })
      const data = await response.json()

      if (response.ok) {
        setN8nRunning(false)
        toast({ title: "N8N Stopped", duration: 2000 })
      } else {
        toast({ title: "Error", description: data.message || "Failed to stop N8N", duration: 3000 })
      }
    } catch (error) {
      console.error("Error stopping N8N:", error)
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to stop N8N", duration: 3000 })
    } finally {
      setN8nLoading(false)
    }
  }

  const handleRefreshN8nWorkflows = async () => {
    setN8nLoading(true)
    try {
      const response = await fetch("/api/n8n/workflows")
      const data = await response.json()

      if (response.ok && data.workflows) {
        setN8nWorkflows(data.workflows)
        toast({ title: "Workflows Loaded", description: `Found ${data.count} workflow(s)`, duration: 2000 })
      } else {
        toast({ title: "Error", description: data.error || "Failed to load workflows", duration: 3000 })
      }
    } catch (error) {
      console.error("Error fetching N8N workflows:", error)
      toast({ title: "Error", description: "Failed to load workflows", duration: 3000 })
    } finally {
      setN8nLoading(false)
    }
  }

  const handleTriggerN8nWorkflow = async (workflowId: string, workflowName: string) => {
    try {
      // If webhook override is set, use it directly
      const triggerPayload: any = { 
        workflowId, 
        preferWebhook: false, // Use REST API by default for reliability
        data: {
          customerName: "Test Customer",
          email: "test@example.com"
        }
      }
      
      if (n8nWebhookOverrideUrl) {
        triggerPayload.webhookUrl = n8nWebhookOverrideUrl
        triggerPayload.preferWebhook = true
      }

      const response = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(triggerPayload),
      })
      const data = await response.json()
      if (response.ok) {
        const desc = data.executionId ? `Execution ID: ${data.executionId}` : (data.message || 'Triggered successfully')
        toast({ title: "Workflow Triggered", description: desc, duration: 3000 })
      } else {
        // Provide more helpful error messages
        let errorMsg = data.error || "Failed to trigger workflow"
        if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
          errorMsg = "Authentication failed. Please activate the workflow in n8n UI or check API token."
        } else if (errorMsg.includes("404") || errorMsg.includes("not registered")) {
          errorMsg = "Webhook not registered. Click 'Execute workflow' in n8n UI first, or activate the workflow."
        }
        toast({ 
          title: "Trigger Failed", 
          description: errorMsg, 
          variant: "destructive",
          duration: 5000 
        })
      }
    } catch (error) {
      console.error("Error triggering workflow:", error)
      toast({ 
        title: "Error", 
        description: "Failed to trigger workflow. Check console for details.", 
        variant: "destructive",
        duration: 3000 
      })
    }
  }

  const handleOpenN8N = () => {
    window.open("http://localhost:5678", "n8n", "width=1200,height=800")
  }

  // Make.com handlers
  const handleConnectMake = async () => {
    if (!makeApiKey.trim()) {
      toast({ title: "Error", description: "Please enter your Make.com API key", duration: 2000 })
      return
    }
    setMakeLoading(true)
    try {
      const response = await fetch("/api/make/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: makeApiKey.trim() }),
      })
      if (response.ok) {
        setMakeConnected(true)
        toast({ title: "Connected to Make.com", description: "Your API key has been stored", duration: 2000 })
        await handleFetchScenarios()
      } else {
        const errorData = await response.json()
        toast({ title: "Connection failed", description: errorData.error || "Failed to connect to Make.com", duration: 3000 })
      }
    } catch (error) {
      console.error("Make.com connect error:", error)
      toast({ title: "Error", description: error instanceof Error ? error.message : "Connection failed", duration: 3000 })
    } finally {
      setMakeLoading(false)
    }
  }

  const handleFetchScenarios = async () => {
    setMakeLoading(true)
    try {
      const response = await fetch("/api/make/scenarios")
      if (response.ok) {
        const data = await response.json()
        if (data.scenarios && Array.isArray(data.scenarios)) {
          setMakeScenarios(data.scenarios)
          toast({ title: "Workflows loaded", description: `Found ${data.scenarios.length} workflow(s)`, duration: 2000 })
        }
      } else {
        const errorData = await response.json()
        if (response.status === 401) {
          setMakeConnected(false)
        }
        toast({ title: "Failed to load workflows", description: errorData.error || "Could not fetch Make.com workflows", duration: 3000 })
      }
    } catch (error) {
      console.error("Error fetching Make scenarios:", error)
      toast({ title: "Error", description: "Failed to load workflows", duration: 3000 })
    } finally {
      setMakeLoading(false)
    }
  }

  const handleDisconnectMake = async () => {
    try {
      await fetch('/api/make/disconnect', { method: 'POST' })
    } catch (e) {
      console.warn('Make.com disconnect API call failed (non-blocking):', e)
    } finally {
      setMakeConnected(false)
      setMakeApiKey("")
      setMakeScenarios([])
      toast({ title: "Disconnected from Make.com", duration: 2000 })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Integrations</h1>

      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 space-y-8">
        {/* Make.com Integration */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-medium text-neutral-900">Make.com Integration</h3>
            <p className="text-sm text-neutral-500 mt-1">Connect your Make.com account to view and manage workflows</p>
          </div>

          {!makeConnected ? (
            <div className="space-y-3">
              <div className="max-w-md">
                <Label htmlFor="make-api-key" className="text-sm">API Key</Label>
                <Input id="make-api-key" type="password" placeholder="Enter your Make.com API key" value={makeApiKey} onChange={(e) => setMakeApiKey(e.target.value)} className="mt-1" />
              </div>
              <Button size="sm" onClick={handleConnectMake} disabled={makeLoading || !makeApiKey.trim()}>
                {makeLoading ? "Connecting..." : "Connect to Make.com"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-neutral-700">✓ <span className="font-medium">Connected to Make.com</span></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleFetchScenarios} disabled={makeLoading}>
                  {makeLoading ? "Refreshing..." : "Refresh Workflows"}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnectMake}>Disconnect</Button>
              </div>
              {makeScenarios.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-neutral-900">Your Workflows ({makeScenarios.length})</h4>
                  {makeScenarios.map((scenario) => (
                    <div key={scenario.id} className="flex items-center justify-between bg-neutral-50 p-3 rounded border border-neutral-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">{scenario.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-1 rounded">{scenario.status}</span>
                          {scenario.enabled && (<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {makeScenarios.length === 0 && !makeLoading && (
                <div className="text-sm text-neutral-500 italic">No workflows found. Create workflows in Make.com and click "Refresh Workflows" to load them.</div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200" />

        {/* N8N Integration */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-medium text-neutral-900">N8N Integration</h3>
            <p className="text-sm text-neutral-500 mt-1">Start N8N to create and manage automation workflows locally</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              {n8nRunning ? (
                <div className="text-sm text-neutral-700">Status: <span className="font-medium text-green-600">✓ Running</span></div>
              ) : (
                <div className="text-sm text-neutral-500">Status: Not running</div>
              )}
            </div>
            <div className="flex gap-2">
              {n8nRunning ? (
                <Button variant="destructive" size="sm" onClick={handleStopN8N} disabled={n8nLoading}>
                  {n8nLoading ? "Stopping..." : "Stop N8N"}
                </Button>
              ) : (
                <Button size="sm" onClick={handleStartN8N} disabled={n8nLoading}>
                  {n8nLoading ? "Starting..." : "Start N8N"}
                </Button>
              )}
            </div>
          </div>

          {n8nRunning && (
            <Button size="sm" variant="outline" onClick={handleOpenN8N}>Create Workflows</Button>
          )}

          {n8nRunning && n8nWorkflows.length > 0 && (
            <div className="space-y-3 mt-4">
              <div>
                <h4 className="text-sm font-medium text-neutral-900">Your Workflows ({n8nWorkflows.length})</h4>
                <p className="text-xs text-neutral-500 mt-1">Workflows created in your local N8N instance</p>
              </div>
              <div className="space-y-2">
                {n8nWorkflows.map((wf) => (
                  <div key={wf.id} className="flex items-center justify-between bg-neutral-50 p-3 rounded border border-neutral-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">{wf.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-1 rounded">{wf.nodes} node{wf.nodes !== 1 ? 's' : ''}</span>
                        {wf.active && (<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleTriggerN8nWorkflow(wf.id, wf.name)}>Trigger</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleRefreshN8nWorkflows} disabled={n8nLoading}>
                {n8nLoading ? "Refreshing..." : "Refresh Workflows"}
              </Button>
            </div>
          )}

          {n8nRunning && n8nWorkflows.length === 0 && !n8nLoading && (
            <div className="text-sm text-neutral-500 italic">No workflows found. Create workflows in N8N (http://localhost:5678) and click "Refresh Workflows" to load them.</div>
          )}
        </div>
      </div>
    </div>
  )
}
