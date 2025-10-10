
export type QboQueryResult = any

export async function queryQuickBooks(query: string): Promise<QboQueryResult> {
  const accessToken = process.env.QB_ACCESS_TOKEN
  const companyId = process.env.QB_COMPANY_ID
  const production = process.env.QB_PRODUCTION === 'true'

  if (!accessToken) {
    throw new Error('QB_ACCESS_TOKEN is not configured in environment')
  }
  if (!companyId) {
    throw new Error('QB_COMPANY_ID is not configured in environment')
  }

  const baseUrl = production
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

  const url = `${baseUrl}/v3/company/${encodeURIComponent(
    companyId,
  )}/query?query=${encodeURIComponent(query)}&minorversion=75`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/text',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    const err: any = new Error(`QuickBooks request failed: ${res.status}`)
    err.status = res.status
    err.body = text
    throw err
  }

  return await res.json()
}

