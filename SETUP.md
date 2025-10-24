# Elas-App Frontend Setup Guide

This frontend connects to the Yardi-QuickBooks Integration API.

## Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:8000` (or your deployed URL)

## Environment Configuration

### 1. Create `.env.local` file

Create a file named `.env.local` in the `Elas-App` directory with the following content:

```env
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

**Note:** If your backend is deployed elsewhere, update the URL accordingly.

## Installation

```bash
# Navigate to the Elas-App directory
cd Elas-App

# Install dependencies
npm install
# or
pnpm install
```

## Running the Application

### Development Mode

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Available API Endpoints

The frontend connects to the following backend endpoints:

### Authentication
- `GET /auth/status` - Check QuickBooks authentication status
- `POST /auth/initiate` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler

### Data Fetching
- `GET /data/expense-invoices` - Fetch bills from QuickBooks
- `GET /data/rent-payments` - Fetch customer payments from QuickBooks

### Sync Operations
- `POST /sync/yardi-to-qb` - Sync data from Yardi to QuickBooks
- `POST /sync/qb-to-yardi` - Sync data from QuickBooks to Yardi
- `GET /sync/yardi-to-qb/{sync_id}/status` - Get sync status
- `GET /sync/qb-to-yardi/{sync_id}/status` - Get sync status

## Features

### Dashboard
- View expense invoices (Bills) from QuickBooks
- View rent payments (Customer Payments) from QuickBooks
- Filter by date range and search
- Real-time data from QuickBooks API

### Sync Operations
- Sync Yardi data to QuickBooks
- Sync QuickBooks data to Yardi
- Track sync operations and status
- View AI-generated insights

### Settings
- QuickBooks authentication status
- OAuth connection management
- API health monitoring

## Project Structure

```
Elas-App/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard page
│   ├── settings/          # Settings page
│   ├── auth/              # Auth callback page
│   └── api/               # API routes (if needed)
├── components/            # React components
│   ├── dashboard-content.tsx
│   ├── settings-content.tsx
│   └── ui/                # UI components (shadcn)
├── lib/                   # Utilities and services
│   ├── api-service.ts     # API client
│   ├── data-service.ts    # Data fetching service
│   └── quickbooks-service.ts  # QuickBooks utilities
└── .env.local            # Environment variables (create this!)
```

## API Service Usage

The frontend uses a typed API service layer:

```typescript
import { QuickBooksDataApi } from '@/lib/api-service'

// Fetch expense invoices
const result = await QuickBooksDataApi.fetchExpenseInvoices({
  from_date: '2025-01-01',
  to_date: '2025-01-31',
  search: 'vendor name'
})

// Fetch rent payments
const payments = await QuickBooksDataApi.fetchRentPayments({
  from_date: '2025-01-01',
  to_date: '2025-01-31'
})
```

## Troubleshooting

### API Connection Issues

If you see "Failed to fetch" errors:

1. **Check backend is running:**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Check CORS settings:** The backend should allow requests from `http://localhost:3000`

3. **Check environment variables:**
   ```bash
   # In Elas-App directory
   cat .env.local
   ```

### QuickBooks Authentication Issues

If authentication fails:

1. Visit Settings page
2. Click "Connect to QuickBooks"
3. Complete OAuth flow
4. Update `QB_REFRESH_TOKEN` in backend `.env` file
5. Restart backend

### No Data Showing

If tables are empty:

1. Check QuickBooks authentication status in Settings
2. Verify date range (default is current month)
3. Check browser console for API errors
4. Verify backend logs for errors

## Development

### Adding New Endpoints

1. Add the endpoint to `lib/api-service.ts`:
```typescript
export class MyNewApi {
  static async myMethod(): Promise<MyType> {
    return apiClient.get<MyType>('/my-endpoint')
  }
}
```

2. Use it in components:
```typescript
import { MyNewApi } from '@/lib/api-service'

const data = await MyNewApi.myMethod()
```

### Updating UI Components

Components are built with:
- **Next.js 14** with App Router
- **React 18** with hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for components

## Support

For issues or questions:
1. Check backend logs: `python api/main.py` output
2. Check browser console for frontend errors
3. Verify environment variables are set correctly
4. Ensure QuickBooks token is valid

