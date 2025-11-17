/**
 * Modulr Initiate Payment API Route
 *
 * Initiates a payout (withdrawal) from Modulr to user's bank account
 * POST /api/fiat/modulr/initiate-payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { modulrAPI, calculateFiatAmount, calculateModulrFee } from '@/lib/modulr-api';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      walletAddress,
      rainumAmount,
      fiatCurrency = 'EUR',
      destinationAccountNumber,
      destinationSortCode,
      destinationIban,
    } = body;

    // Validation
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!rainumAmount || rainumAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid RAINUM amount' },
        { status: 400 }
      );
    }

    if (!destinationAccountNumber && !destinationIban) {
      return NextResponse.json(
        { error: 'Destination bank account is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user || !user.modulrAccountId) {
      return NextResponse.json(
        { error: 'User not found or Modulr account not set up' },
        { status: 404 }
      );
    }

    // Check KYC status
    if (user.kycStatus !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'KYC verification required before withdrawals' },
        { status: 403 }
      );
    }

    // Calculate fiat amount
    const fiatAmount = calculateFiatAmount(rainumAmount, fiatCurrency);
    const fee = calculateModulrFee(fiatAmount);
    const netFiatAmount = fiatAmount - fee;
    const exchangeRate = rainumAmount / netFiatAmount;

    console.log(`[Withdrawal] ${rainumAmount} RAINUM → ${netFiatAmount} ${fiatCurrency}`);

    // Create transaction record (status: PROCESSING)
    const transaction = await prisma.fiatTransaction.create({
      data: {
        userId: user.id,
        type: 'SELL',
        provider: 'MODULR',
        status: 'PROCESSING',
        fiatAmount: netFiatAmount,
        fiatCurrency,
        cryptoAmount: rainumAmount,
        exchangeRate,
        feeAmount: fee,
      },
    });

    try {
      // Step 1: Burn RAINUM tokens on blockchain
      const rainumApiUrl = process.env.RAINUM_API_URL || 'http://localhost:8080';
      const adminApiKey = process.env.RAINUM_ADMIN_API_KEY || '';

      const burnResponse = await axios.post(
        `${rainumApiUrl}/api/admin/burn`,
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

      const txHash = burnResponse.data.txHash || burnResponse.data.hash;

      console.log(`[Withdrawal] ✓ Burned ${rainumAmount} RAINUM, tx: ${txHash}`);

      // Update transaction with blockchain tx hash
      await prisma.fiatTransaction.update({
        where: { id: transaction.id },
        data: {
          rainumTxHash: txHash,
        },
      });

      // Step 2: Initiate payment via Modulr
      const paymentResponse = await modulrAPI.initiatePayment({
        sourceAccountId: user.modulrAccountId,
        destinationAccountNumber,
        destinationSortCode,
        destinationIban,
        amount: netFiatAmount,
        currency: fiatCurrency,
        reference: `Rainum withdrawal ${transaction.id.slice(0, 8)}`,
      });

      console.log(`[Withdrawal] ✓ Payment initiated: ${paymentResponse.id}`);

      // Update transaction with Modulr payment ID
      await prisma.fiatTransaction.update({
        where: { id: transaction.id },
        data: {
          modulrPaymentId: paymentResponse.id,
          status: 'PROCESSING', // Will be updated to COMPLETED via webhook
        },
      });

      return NextResponse.json({
        success: true,
        transactionId: transaction.id,
        paymentId: paymentResponse.id,
        rainumAmount,
        fiatAmount: netFiatAmount,
        fiatCurrency,
        fee,
        status: 'PROCESSING',
        message: 'Withdrawal initiated successfully. Funds will be transferred shortly.',
      });

    } catch (error: any) {
      console.error('[Withdrawal] Error:', error);

      // Update transaction status to FAILED
      await prisma.fiatTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      // TODO: If burn succeeded but payment failed, consider refunding RAINUM

      throw error;
    }

  } catch (error: any) {
    console.error('[API] Initiate payment error:', error);

    return NextResponse.json(
      {
        error: 'Failed to initiate payment',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
