# FIAT-X-RAINUM Integration Plan

## 🎯 Project Overview

**Goal:** Add fiat buy/sell functionality to Rainum Wallet using Modulr + MoonPay

**Approach:** Clone rainum-wallet → Add fiat features → Test separately → Merge if successful

---

## 📊 Tech Stack Analysis

### Current Stack (rainum-wallet):
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Crypto:** @noble/ed25519, tweetnacl, bip39
- **UI:** Headless UI, Framer Motion, Lucide React
- **Backend:** Next.js API Routes (/app/api/)

### What We're Adding:
- **Payment Providers:** Modulr API + MoonPay SDK
- **Database:** PostgreSQL (for fiat transactions, KYC data)
- **Backend API:** Next.js API routes for Modulr/MoonPay
- **New State:** Zustand store for fiat operations
- **New Components:** Buy/Sell UI, KYC flow, transaction history

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Rainum Wallet (Frontend)                   │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Wallet  │  │   Send   │  │ Staking  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                          │
│  ┌──────────────────────────────────────┐  ← NEW       │
│  │        Buy/Sell Fiat                 │              │
│  │  ┌────────┐        ┌────────┐       │              │
│  │  │ Modulr │        │MoonPay │       │              │
│  │  │  Buy   │        │  Buy   │       │              │
│  │  └────────┘        └────────┘       │              │
│  │  ┌────────┐        ┌────────┐       │              │
│  │  │ Modulr │        │MoonPay │       │              │
│  │  │  Sell  │        │  Sell  │       │              │
│  │  └────────┘        └────────┘       │              │
│  └──────────────────────────────────────┘              │
└──────────────┬──────────────┬───────────────────────────┘
               │              │
        ┌──────▼─────┐   ┌───▼────────┐
        │  Next.js   │   │   Next.js  │
        │ Modulr API │   │ MoonPay API│
        │   Routes   │   │   Routes   │
        └──────┬─────┘   └───┬────────┘
               │             │
        ┌──────▼─────────────▼──────┐
        │    PostgreSQL Database    │
        │  - Users                  │
        │  - Fiat Transactions      │
        │  - KYC Documents          │
        │  - Exchange Rates         │
        └───────────────────────────┘
               │
        ┌──────▼─────────┐
        │ Rainum Blockchain API  │
        │ (Mint/Burn)            │
        └────────────────────────┘
```

---

## 📁 New Files Structure

```
rainum-wallet/
├── app/
│   ├── api/
│   │   ├── fiat/
│   │   │   ├── modulr/
│   │   │   │   ├── create-customer/route.ts    ← Modulr customer creation
│   │   │   │   ├── create-account/route.ts     ← Modulr account creation
│   │   │   │   ├── initiate-payment/route.ts   ← Modulr payout (sell)
│   │   │   │   └── webhook/route.ts            ← Modulr webhooks (PAYIN/PAYOUT)
│   │   │   ├── moonpay/
│   │   │   │   ├── create-transaction/route.ts ← MoonPay buy/sell
│   │   │   │   ├── get-quote/route.ts          ← MoonPay price quote
│   │   │   │   └── webhook/route.ts            ← MoonPay webhooks
│   │   │   ├── transactions/route.ts           ← Get user fiat transactions
│   │   │   ├── rates/route.ts                  ← Exchange rates
│   │   │   └── kyc/route.ts                    ← KYC submission
│   │   └── rainum/
│   │       ├── mint/route.ts                   ← Admin mint (for deposits)
│   │       └── burn/route.ts                   ← Admin burn (for withdrawals)
│   └── dashboard/
│       └── page.tsx                            ← Modified: Add "Buy/Sell" nav
│
├── components/
│   ├── fiat/
│   │   ├── BuySellPanel.tsx                    ← Main Buy/Sell UI
│   │   ├── ModulrBuyForm.tsx                   ← Modulr buy form
│   │   ├── ModulrSellForm.tsx                  ← Modulr sell form
│   │   ├── MoonPayBuyWidget.tsx                ← MoonPay buy widget
│   │   ├── MoonPaySellWidget.tsx               ← MoonPay sell widget
│   │   ├── ProviderSelector.tsx                ← Choose Modulr vs MoonPay
│   │   ├── KYCVerification.tsx                 ← KYC form/upload
│   │   ├── FiatTransactionHistory.tsx          ← Fiat tx history
│   │   └── ExchangeRateDisplay.tsx             ← Live exchange rates
│   └── ... (existing components)
│
├── lib/
│   ├── fiat-store.ts                           ← Zustand store for fiat
│   ├── modulr-api.ts                           ← Modulr API client
│   ├── moonpay-api.ts                          ← MoonPay API client
│   ├── fiat-transaction-utils.ts               ← Transaction helpers
│   └── ... (existing lib files)
│
├── prisma/                                      ← NEW (Database)
│   ├── schema.prisma                           ← Database schema
│   └── migrations/
│       └── ... (migration files)
│
├── .env.local                                   ← Add API keys
└── package.json                                 ← Add dependencies
```

---

## 🗄️ Database Schema (PostgreSQL + Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                    String   @id @default(uuid())
  walletAddress         String   @unique  // Rainum wallet address
  email                 String?  @unique

  // Modulr IDs
  modulrCustomerId      String?  @unique
  modulrAccountId       String?  @unique

  // MoonPay ID
  moonpayCustomerId     String?  @unique

  // KYC Status
  kycStatus             KYCStatus @default(PENDING)
  kycProvider           String?  // "modulr" or "moonpay"

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  transactions          FiatTransaction[]
  kycDocuments          KYCDocument[]
}

model FiatTransaction {
  id                    String   @id @default(uuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])

  type                  TransactionType  // BUY or SELL
  provider              Provider         // MODULR or MOONPAY
  status                TransactionStatus @default(PENDING)

  // Fiat side
  fiatAmount            Decimal  @db.Decimal(20, 2)
  fiatCurrency          String   @default("EUR")

  // Crypto side
  cryptoAmount          Decimal  @db.Decimal(30, 8)
  rainumTxHash          String?  // Blockchain tx hash

  // Exchange info
  exchangeRate          Decimal  @db.Decimal(20, 8)
  feeAmount             Decimal  @db.Decimal(20, 2)

  // Provider IDs
  modulrPaymentId       String?  @unique
  moonpayTransactionId  String?  @unique

  // Timestamps
  createdAt             DateTime @default(now())
  completedAt           DateTime?

  // Metadata
  notes                 String?
  errorMessage          String?
}

model KYCDocument {
  id                    String   @id @default(uuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])

  documentType          String   // "passport", "drivers_license", "proof_of_address"
  documentUrl           String   // S3 or local path
  status                DocumentStatus @default(PENDING)

  uploadedAt            DateTime @default(now())
  verifiedAt            DateTime?
}

model ExchangeRate {
  id                    Int      @id @default(autoincrement())
  rainumToUSD           Decimal  @db.Decimal(20, 8)
  rainumToEUR           Decimal  @db.Decimal(20, 8)
  rainumToGBP           Decimal  @db.Decimal(20, 8)
  timestamp             DateTime @default(now())

  @@index([timestamp])
}

model WebhookLog {
  id                    Int      @id @default(autoincrement())
  provider              String   // "modulr" or "moonpay"
  webhookType           String   // "PAYIN", "PAYOUT", etc.
  payload               Json
  processed             Boolean  @default(false)
  receivedAt            DateTime @default(now())

  @@index([provider, processed])
}

enum KYCStatus {
  PENDING
  VERIFIED
  REJECTED
  EXPIRED
}

enum TransactionType {
  BUY
  SELL
}

enum Provider {
  MODULR
  MOONPAY
}

enum TransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum DocumentStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## 🔌 API Routes Details

### 1. Modulr Routes

#### `/api/fiat/modulr/create-customer`
```typescript
POST /api/fiat/modulr/create-customer
Body: {
  walletAddress: string
  email: string
  fullName: string
  dateOfBirth: string
  address: {
    street: string
    city: string
    country: string
    postalCode: string
  }
}

Response: {
  modulrCustomerId: string
  modulrAccountId: string
  accountNumber: string
  sortCode: string
}
```

#### `/api/fiat/modulr/webhook`
```typescript
POST /api/fiat/modulr/webhook
Headers: {
  x-modulr-signature: string
}
Body: {
  type: "PAYIN" | "PAYOUT"
  accountId: string
  amount: number
  currency: string
  transactionId: string
}

Flow (PAYIN - User deposits):
1. Verify webhook signature
2. Find user by modulrAccountId
3. Calculate RAINUM amount
4. Call /api/rainum/mint
5. Update FiatTransaction status
6. Notify user
```

### 2. MoonPay Routes

#### `/api/fiat/moonpay/create-transaction`
```typescript
POST /api/fiat/moonpay/create-transaction
Body: {
  walletAddress: string
  type: "BUY" | "SELL"
  fiatAmount: number
  fiatCurrency: string
}

Response: {
  moonpayUrl: string  // Redirect user here
  transactionId: string
}
```

### 3. Rainum Admin Routes

#### `/api/rainum/mint`
```typescript
POST /api/rainum/mint
Headers: {
  Authorization: "Bearer ADMIN_API_KEY"
}
Body: {
  address: string
  amount: number
}

Response: {
  txHash: string
  success: boolean
}
```

---

## 🎨 UI Components

### BuySellPanel Component
```
┌─────────────────────────────────────────┐
│         Buy / Sell RAINUM               │
├─────────────────────────────────────────┤
│                                         │
│  [  Buy  ] [  Sell  ]                  │
│                                         │
│  Select Provider:                       │
│  ○ Modulr (0.5% fee)                   │
│  ○ MoonPay (2.9% fee)                  │
│                                         │
│  Amount (EUR):  [______100______]      │
│                                         │
│  You will receive: ~950 RAINUM         │
│  Exchange rate: 1 EUR = 9.5 RAINUM     │
│  Fee: 0.50 EUR                          │
│                                         │
│  [      Continue with Modulr      ]     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📝 Implementation Steps

### Phase 1: Database Setup (1 day)
- [x] Install Prisma
- [ ] Create schema.prisma
- [ ] Run migrations
- [ ] Test database connection

### Phase 2: Modulr Integration (3-4 days)
- [ ] Create Modulr API client (lib/modulr-api.ts)
- [ ] API route: create-customer
- [ ] API route: webhook handler
- [ ] API route: initiate-payment (sell)
- [ ] Test with Modulr sandbox

### Phase 3: MoonPay Integration (2-3 days)
- [ ] Install MoonPay SDK
- [ ] Create MoonPay API client (lib/moonpay-api.ts)
- [ ] API route: create-transaction
- [ ] API route: webhook handler
- [ ] Test with MoonPay sandbox

### Phase 4: Rainum Admin API (1-2 days)
- [ ] Add admin endpoints to rainum-blockchain
- [ ] POST /api/admin/mint
- [ ] POST /api/admin/burn
- [ ] API key authentication
- [ ] Test minting/burning

### Phase 5: UI Components (4-5 days)
- [ ] Create fiat-store.ts (Zustand)
- [ ] BuySellPanel component
- [ ] ModulrBuyForm component
- [ ] ModulrSellForm component
- [ ] MoonPayBuyWidget component
- [ ] MoonPaySellWidget component
- [ ] KYCVerification component
- [ ] FiatTransactionHistory component
- [ ] Add "Buy/Sell" to dashboard navigation

### Phase 6: Integration & Flows (2-3 days)
- [ ] User onboarding flow (KYC)
- [ ] Buy flow (Fiat → Crypto)
  - Modulr: Bank transfer → Webhook → Mint
  - MoonPay: Widget → Webhook → Mint
- [ ] Sell flow (Crypto → Fiat)
  - Modulr: Burn → API call → Payout
  - MoonPay: Widget → Burn → Payout
- [ ] Error handling & rollbacks
- [ ] Transaction history display

### Phase 7: Testing (2-3 days)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Test buy flow (both providers)
- [ ] Test sell flow (both providers)
- [ ] Test webhooks
- [ ] Test KYC flow

### Phase 8: Security & Compliance (2-3 days)
- [ ] Webhook signature verification
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] Audit logging for fiat operations
- [ ] BVI VASP compliance checklist
- [ ] Security review

---

## 🔑 Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rainum_fiat"

# Modulr
MODULR_API_KEY="your-modulr-api-key"
MODULR_API_SECRET="your-modulr-api-secret"
MODULR_SANDBOX_URL="https://api-sandbox.modulrfinance.com"
MODULR_PRODUCTION_URL="https://api.modulrfinance.com"
MODULR_WEBHOOK_SECRET="your-webhook-secret"

# MoonPay
MOONPAY_API_KEY="your-moonpay-api-key"
MOONPAY_SECRET_KEY="your-moonpay-secret-key"
MOONPAY_SANDBOX_URL="https://buy-sandbox.moonpay.com"
MOONPAY_PRODUCTION_URL="https://buy.moonpay.com"
MOONPAY_WEBHOOK_SECRET="your-webhook-secret"

# Rainum Blockchain
RAINUM_ADMIN_API_KEY="your-admin-api-key"
RAINUM_API_URL="http://localhost:8080"

# Exchange Rates (optional - for custom pricing)
RAINUM_EUR_RATE="9.5"  # 1 EUR = 9.5 RAINUM
RAINUM_USD_RATE="10.0"  # 1 USD = 10 RAINUM

# Fees
MODULR_FEE_PERCENT="0.5"
MOONPAY_FEE_PERCENT="2.9"

# JWT Secret (for admin API)
JWT_SECRET="your-jwt-secret"
```

---

## 📦 New Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "@moonpay/moonpay-sdk": "^1.0.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0"
  }
}
```

---

## 🚀 Next Steps

1. **Install Dependencies**
   ```bash
   cd rainum-wallet
   npm install @prisma/client axios
   npm install -D prisma
   ```

2. **Initialize Prisma**
   ```bash
   npx prisma init
   ```

3. **Start Building**
   - Begin with Phase 1 (Database)
   - Then Phase 2 (Modulr)
   - Progressive testing as we go

---

## ✅ Success Criteria

- [ ] User can register and complete KYC
- [ ] User can buy RAINUM with EUR via Modulr
- [ ] User can buy RAINUM with EUR via MoonPay
- [ ] User can sell RAINUM for EUR via Modulr
- [ ] User can sell RAINUM for EUR via MoonPay
- [ ] All transactions are logged and visible
- [ ] Exchange rates are accurate
- [ ] Webhooks are processed correctly
- [ ] Security measures in place
- [ ] BVI VASP compliant

---

**Ready to start building!** 🚀
