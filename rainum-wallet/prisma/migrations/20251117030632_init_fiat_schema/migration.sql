-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('MODULR', 'MOONPAY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "email" TEXT,
    "modulrCustomerId" TEXT,
    "modulrAccountId" TEXT,
    "moonpayCustomerId" TEXT,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "kycProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiatTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "provider" "Provider" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "fiatAmount" DECIMAL(20,2) NOT NULL,
    "fiatCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "cryptoAmount" DECIMAL(30,8) NOT NULL,
    "rainumTxHash" TEXT,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "feeAmount" DECIMAL(20,2) NOT NULL,
    "modulrPaymentId" TEXT,
    "moonpayTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "FiatTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KYCDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "KYCDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "rainumToUSD" DECIMAL(20,8) NOT NULL,
    "rainumToEUR" DECIMAL(20,8) NOT NULL,
    "rainumToGBP" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "webhookType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_modulrCustomerId_key" ON "User"("modulrCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_modulrAccountId_key" ON "User"("modulrAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_moonpayCustomerId_key" ON "User"("moonpayCustomerId");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FiatTransaction_modulrPaymentId_key" ON "FiatTransaction"("modulrPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "FiatTransaction_moonpayTransactionId_key" ON "FiatTransaction"("moonpayTransactionId");

-- CreateIndex
CREATE INDEX "FiatTransaction_userId_createdAt_idx" ON "FiatTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FiatTransaction_status_idx" ON "FiatTransaction"("status");

-- CreateIndex
CREATE INDEX "FiatTransaction_provider_status_idx" ON "FiatTransaction"("provider", "status");

-- CreateIndex
CREATE INDEX "KYCDocument_userId_status_idx" ON "KYCDocument"("userId", "status");

-- CreateIndex
CREATE INDEX "ExchangeRate_timestamp_idx" ON "ExchangeRate"("timestamp");

-- CreateIndex
CREATE INDEX "WebhookLog_provider_processed_idx" ON "WebhookLog"("provider", "processed");

-- CreateIndex
CREATE INDEX "WebhookLog_receivedAt_idx" ON "WebhookLog"("receivedAt");

-- AddForeignKey
ALTER TABLE "FiatTransaction" ADD CONSTRAINT "FiatTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCDocument" ADD CONSTRAINT "KYCDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
