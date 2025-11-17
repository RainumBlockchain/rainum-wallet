/**
 * MoonPay Webhook Handler
 *
 * Handles webhooks from MoonPay for transaction updates
 * POST /api/fiat/moonpay/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { moonpayAPI, calculateRainumFromUSDC, calculateUSDCFromRainum } from '@/lib/moonpay-api';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('moonpay-signature');

    if (!signature) {
      console.error('[MoonPay Webhook] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = moonpayAPI.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('[MoonPay Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const webhook = moonpayAPI.parseWebhook(payload);

    console.log(`[MoonPay Webhook] Received ${webhook.type}: ${webhook.data.id}`);

    // Log webhook to database
    await prisma.webhookLog.create({
      data: {
        provider: 'moonpay',
        webhookType: webhook.type,
        payload: payload,
        processed: false,
      },
    });

    // Handle different webhook types
    switch (webhook.type) {
      case 'transaction_created':
        await handleTransactionCreated(webhook.data);
        break;

      case 'transaction_updated':
        await handleTransactionUpdated(webhook.data);
        break;

      case 'transaction_completed':
        await handleTransactionCompleted(webhook.data);
        break;

      case 'transaction_failed':
        await handleTransactionFailed(webhook.data);
        break;

      default:
        console.log(`[MoonPay Webhook] Unhandled type: ${webhook.type}`);
    }

    // Mark webhook as processed
    await prisma.webhookLog.updateMany({
      where: {
        provider: 'moonpay',
        payload: payload,
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[MoonPay Webhook] Error:', error);

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
 * Handle transaction_created webhook
 */
async function handleTransactionCreated(data: any) {
  console.log(`[MoonPay] Transaction created: ${data.id}`);

  // Find user by wallet address
  const user = await prisma.user.findUnique({
    where: { walletAddress: data.walletAddress },
  });

  if (!user) {
    console.error(`[MoonPay] User not found for wallet ${data.walletAddress}`);
    return;
  }

  // Check if transaction already exists
  const existingTx = await prisma.fiatTransaction.findUnique({
    where: { moonpayTransactionId: data.id },
  });

  if (existingTx) {
    console.log(`[MoonPay] Transaction already exists: ${data.id}`);
    return;
  }

  // Determine transaction type (buy or sell based on MoonPay data)
  const isBuy = data.baseCurrency && data.cryptoCurrency; // Buy: fiat → crypto
  const type = isBuy ? 'BUY' : 'SELL';

  // Create transaction record
  await prisma.fiatTransaction.create({
    data: {
      userId: user.id,
      type,
      provider: 'MOONPAY',
      status: 'PROCESSING',
      fiatAmount: data.baseCurrencyAmount || 0,
      fiatCurrency: data.baseCurrency || 'USD',
      cryptoAmount: data.cryptoCurrencyAmount || 0,
      exchangeRate: data.cryptoCurrencyAmount / data.baseCurrencyAmount || 0,
      feeAmount: (data.feeAmount || 0) + (data.extraFeeAmount || 0),
      moonpayTransactionId: data.id,
    },
  });

  console.log(`[MoonPay] ✓ Created ${type} transaction record for ${data.id}`);
}

/**
 * Handle transaction_updated webhook
 */
async function handleTransactionUpdated(data: any) {
  console.log(`[MoonPay] Transaction updated: ${data.id}, status: ${data.status}`);

  // Find transaction
  let transaction = await prisma.fiatTransaction.findUnique({
    where: { moonpayTransactionId: data.id },
  });

  if (!transaction) {
    // Transaction might have been created outside our system
    console.log(`[MoonPay] Transaction not found, creating: ${data.id}`);
    await handleTransactionCreated(data);
    return;
  }

  // Map MoonPay status to our status
  let status = 'PROCESSING';
  if (data.status === 'completed') status = 'COMPLETED';
  if (data.status === 'failed') status = 'FAILED';
  if (data.status === 'cancelled') status = 'CANCELLED';

  // Update transaction
  await prisma.fiatTransaction.update({
    where: { id: transaction.id },
    data: {
      status,
      cryptoAmount: data.cryptoCurrencyAmount || transaction.cryptoAmount,
      fiatAmount: data.baseCurrencyAmount || transaction.fiatAmount,
    },
  });

  console.log(`[MoonPay] ✓ Updated transaction ${data.id} to ${status}`);
}

/**
 * Handle transaction_completed webhook - MINT or CONFIRM RAINUM
 */
async function handleTransactionCompleted(data: any) {
  console.log(`[MoonPay] Transaction completed: ${data.id}`);

  // Find transaction
  const transaction = await prisma.fiatTransaction.findUnique({
    where: { moonpayTransactionId: data.id },
    include: { user: true },
  });

  if (!transaction) {
    console.error(`[MoonPay] Transaction not found: ${data.id}`);
    return;
  }

  if (transaction.status === 'COMPLETED') {
    console.log(`[MoonPay] Transaction already completed: ${data.id}`);
    return;
  }

  try {
    const rainumApiUrl = process.env.RAINUM_API_URL || 'http://localhost:8080';
    const adminApiKey = process.env.RAINUM_ADMIN_API_KEY || '';

    if (transaction.type === 'BUY') {
      // User bought crypto → mint RAINUM
      // MoonPay bought USDC for user, we convert to RAINUM
      const usdcAmount = data.cryptoCurrencyAmount || 0;
      const rainumAmount = calculateRainumFromUSDC(usdcAmount);

      console.log(`[MoonPay] Converting ${usdcAmount} USDC → ${rainumAmount} RAINUM`);

      // Mint RAINUM
      const response = await axios.post(
        `${rainumApiUrl}/api/admin/mint`,
        {
          address: transaction.user.walletAddress,
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

      // Update transaction
      await prisma.fiatTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          cryptoAmount: rainumAmount,
          rainumTxHash: txHash,
          completedAt: new Date(),
        },
      });

      console.log(`[MoonPay] ✓ Minted ${rainumAmount} RAINUM, tx: ${txHash}`);

    } else if (transaction.type === 'SELL') {
      // User sold crypto → just mark as completed
      // RAINUM should have been burned when transaction was initiated

      await prisma.fiatTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      console.log(`[MoonPay] ✓ Sell transaction completed: ${data.id}`);
    }

  } catch (error: any) {
    console.error('[MoonPay] Completion handling failed:', error);

    // Update transaction with error
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
 * Handle transaction_failed webhook
 */
async function handleTransactionFailed(data: any) {
  console.log(`[MoonPay] Transaction failed: ${data.id}`);

  // Find transaction
  const transaction = await prisma.fiatTransaction.findUnique({
    where: { moonpayTransactionId: data.id },
  });

  if (!transaction) {
    console.error(`[MoonPay] Transaction not found: ${data.id}`);
    return;
  }

  // Update transaction status
  await prisma.fiatTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'FAILED',
      errorMessage: data.failureReason || 'Transaction failed',
    },
  });

  console.log(`[MoonPay] ✗ Transaction marked as failed: ${data.id}`);

  // TODO: If this was a SELL and RAINUM was already burned, consider refunding
}
