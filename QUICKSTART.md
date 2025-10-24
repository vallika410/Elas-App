# 🚀 Quick Start Guide

## Your UI is Already Connected! ✅

The Elas-App frontend is **already fully integrated** with the yardi-qb-integration API. Here's what you need to do to get it running:

## Step 1: Configure Environment

Create `.env.local` in the `Elas-App` directory:

```bash
cd Elas-App
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
EOF
```

## Step 2: Install Dependencies

```bash
npm install
# or
pnpm install
```

## Step 3: Start the Frontend

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

## Step 4: Make Sure Backend is Running

In another terminal, start the backend API:

```bash
cd ..  # Back to yardi-qb-integration root
python api/main.py
```

Backend will run at **http://localhost:8000**

## 🎉 That's It!

Visit **http://localhost:3000/dashboard** and you should see:
- ✅ Expense Invoices from QuickBooks
- ✅ Rent Payments from QuickBooks
- ✅ Sync operations between Yardi and QuickBooks

## Already Integrated Features

### ✅ Dashboard (`/dashboard`)
- **Expense Invoices Table** - Shows Bills from QuickBooks
  - Calls: `GET /api/v1/data/expense-invoices`
  - Filters: Date range, search by vendor/doc number
  - Shows: Vendor name, doc number, due date, amount, status
  
- **Rent Payments Table** - Shows Customer Payments from QuickBooks
  - Calls: `GET /api/v1/data/rent-payments`
  - Filters: Date range, search by tenant/reference
  - Shows: Tenant name, payment date, amount, reference

- **Sync Operations**
  - Sync from Yardi → QuickBooks
  - Sync from QuickBooks → Yardi
  - Track sync status and progress

### ✅ Settings (`/settings`)
- QuickBooks authentication status
- OAuth connection management
- Connect/disconnect QuickBooks account

### ✅ Authentication (`/auth/callback`)
- Handles QuickBooks OAuth callback
- Automatically exchanges code for tokens
- Stores tokens securely

## API Endpoints Being Used

The frontend is already calling these endpoints:

| Endpoint | Method | Used By | Purpose |
|----------|--------|---------|---------|
| `/auth/status` | GET | Settings | Check QB auth status |
| `/auth/initiate` | POST | Settings | Start OAuth flow |
| `/auth/callback` | GET | Auth callback | Complete OAuth |
| `/data/expense-invoices` | GET | Dashboard | Fetch bills |
| `/data/rent-payments` | GET | Dashboard | Fetch payments |
| `/sync/yardi-to-qb` | POST | Dashboard | Sync Yardi→QB |
| `/sync/qb-to-yardi` | POST | Dashboard | Sync QB→Yardi |
| `/health` | GET | Settings | API health check |

## Troubleshooting

### Port Already in Use
```bash
# Frontend (3000)
npx kill-port 3000
npm run dev

# Backend (8000)
npx kill-port 8000
python api/main.py
```

### No Data Showing

1. **Check backend is running:**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Check QuickBooks auth:** Visit http://localhost:3000/settings
   - If not authenticated, click "Connect to QuickBooks"

3. **Check browser console** for errors (F12)

4. **Check backend logs** for API errors

### CORS Errors

The backend should automatically allow requests from `http://localhost:3000` (CORS is configured with `allow_origins=["*"]` in development).

## Next Steps

1. **✅ You're done!** The UI is fully connected
2. Test the expense invoices table
3. Test the rent payments table
4. Try syncing data between systems
5. Check the Settings page for QB authentication

## Code Structure

Your UI service layer (`lib/api-service.ts`) provides:

```typescript
// Authentication
AuthApi.getAuthStatus()
AuthApi.initiateOAuth()
AuthApi.exchangeCode()

// Data Fetching
QuickBooksDataApi.fetchExpenseInvoices({ from_date, to_date, search })
QuickBooksDataApi.fetchRentPayments({ from_date, to_date, search })

// Sync Operations
YardiToQbApi.syncYardiToQb(request)
QbToYardiApi.syncQbToYardi(request)
```

All of these are **already being used** by the Dashboard and Settings components!

## Need Help?

Check the full documentation in [SETUP.md](./SETUP.md)

