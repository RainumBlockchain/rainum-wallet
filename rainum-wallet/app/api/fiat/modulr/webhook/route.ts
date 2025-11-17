/**
 * Modulr Webhook Handler
 *
 * Handles webhooks from Modulr for PAYIN (deposits) and PAYOUT (withdrawals)
 * POST /api/fiat/modulr/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { modulrAPI, calculateRainumAmount, calculateModulrFee } from '@/lib/modulr-api';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-modulr-signature');

    if (!signature) {
      console.error('[Webhook] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = modulrAPI.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const webhook = modulrAPI.parseWebhook(payload);

    console.log(`[Webhook] Received ${webhook.type}:`, webhook.id);

    // Log webhook to database
    await prisma.webhookLog.create({
      data: {
        provider: 'modulr',
        webhookType: webhook.type,
        payload: payload,
        processed: false,
      },
    });

    // Handle different webhook types
    switch (webhook.type) {
      case 'PAYIN':
        await handlePayin(webhook);
        break;

      case 'PAYOUT':
        await handlePayout(webhook);
        break;

      case 'CUSTOMER_VERIFICATION':
        await handleCustomerVerification(webhook);
        break;

      default:
        console.log(`[Webhook] Unhandled type: ${webhook.type}`);
    }

    // Mark webhook as processed
    await prisma.webhookLog.updateMany({
      where: {
        provider: 'modulr',
        payload: payload,
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Webhook] Error:', error);

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle PAYIN webhook - User deposited fiat, mint RAINUM
 */
async function handlePayin(webhook: any) {
  const {
    accountId,
    amount,
    currency,
    transactionId,
    reference,
  } = webhook.data;

  console.log(`[PAYIN] Processing deposit: ${amount} ${currency}`);

  // Find user by Modulr account ID
  const user = await prisma.user.findUnique({
    where: { modulrAccountId: accountId },
  });

  if (!user) {
    console.error(`[PAYIN] User not found for account ${accountId}`);
    throw new Error('User not found');
  }

  // Check if transaction already exists
  const existingTx = await prisma.fiatTransaction.findUnique({
    where: { modulrPaymentId: transactionId },
  });

  if (existingTx) {
    console.log(`[PAYIN] Transaction already processed: ${transactionId}`);
    return;
  }

  // Calculate RAINUM amount
  const fee = calculateModulrFee(amount);
  const rainumAmount = calculateRainumAmount(amount, currency);
  const exchangeRate = rainumAmount / (amount - fee);

  // Create transaction record (status: PROCESSING)
  const transaction = await prisma.fiatTransaction.create({
    data: {
      userId: user.id,
      type: 'BUY',
      provider: 'MODULR',
      status: 'PROCESSING',
      fiatAmount: amount,
      fiatCurrency: currency,
      cryptoAmount: rainumAmount,
      exchangeRate,
      feeAmount: fee,
      modulrPaymentId: transactionId,
      notes: reference,
    },
  });

  try {
    // Mint RAINUM tokens via blockchain API
    const rainumApiUrl = process.env.RAINUM_API_URL || 'http://localhost:8080';
    const adminApiKey = process.env.RAINUM_ADMIN_API_KEY || '';

    const response = await axios.post(
      `${rainumApiUrl}/api/admin/mint`,
      {
        address: user.walletAddress,
        amount: rainumAmount,
      },
      {
        headers: {
          'Authorization': `Bearer ${adminApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const txHash = response.data.txHash || response.data.hash;

    // Update transaction (status: COMPLETED)
    await prisma.fiatTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        rainumTxHash: txHash,
        completedAt: new Date(),
      },
    });

    console.log(`[PAYIN] ✓ Minted ${rainumAmount} RAINUM for ${user.walletAddress}`);
    console.log(`[PAYIN] ✓ Blockchain tx: ${txHash}`);

  } catch (error: any) {
    console.error('[PAYIN] Minting failed:', error);

    // Update transaction (status: FAILED)
    await prisma.fiatTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
      },
    });

    throw error;
  }
}

/**
 * Handle PAYOUT webhook - Withdrawal completed
 */
async function handlePayout(webhook: any) {
  const { transactionId, status } = webhook.data;

  console.log(`[PAYOUT] Processing payout: ${transactionId}`);

  // Find transaction by Modulr payment ID
  const transaction = await prisma.fiatTransaction.findUnique({
    where: { modulrPaymentId: transactionId },
  });

  if (!transaction) {
    console.error(`[PAYOUT] Transaction not found: ${transactionId}`);
    return;
  }

  // Update transaction status
  if (status === 'COMPLETED') {
    await prisma.fiatTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    console.log(`[PAYOUT] ✓ Withdrawal completed: ${transactionId}`);
  } else if (status === 'FAILED') {
    await prisma.fiatTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        errorMessage: webhook.data.failureReason || 'Payment failed',
      },
    });

    console.log(`[PAYOUT] ✗ Withdrawal failed: ${transactionId}`);

    // TODO: Refund RAINUM tokens to user if withdrawal failed
  }
}

/**
 * Handle CUSTOMER_VERIFICATION webhook - KYC status update
 */
async function handleCustomerVerification(webhook: any) {
  const { customerId, verified } = webhook.data;

  console.log(`[KYC] Customer ${customerId} verification: ${verified}`);

  // Update user KYC status
  await prisma.user.updateMany({
    where: { modulrCustomerId: customerId },
    data: {
      kycStatus: verified ? 'VERIFIED' : 'REJECTED',
    },
  });

  console.log(`[KYC] ✓ Updated KYC status for customer ${customerId}`);
}
