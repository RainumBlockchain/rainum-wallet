/**
 * MoonPay Create Transaction API Route
 *
 * Generates a signed MoonPay widget URL for buy/sell transactions
 * POST /api/fiat/moonpay/create-transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { moonpayAPI, type CreateTransactionParams } from '@/lib/moonpay-api';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      walletAddress,
      type = 'BUY', // BUY or SELL
      baseCurrency = 'EUR',
      baseCurrencyAmount,
      email,
    } = body;

    // Validation
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!['BUY', 'SELL'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be BUY or SELL' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          email,
          kycStatus: 'PENDING',
          kycProvider: 'moonpay',
        },
      });
    } else if (email && !user.email) {
      // Update email if provided and not set
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email },
      });
    }

    // Generate redirect URL (return to our app after transaction)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const redirectUrl = `${baseUrl}/dashboard?moonpay_status=completed`;

    // Generate MoonPay widget URL
    const params: CreateTransactionParams = {
      walletAddress,
      baseCurrency,
      baseCurrencyAmount,
      email: user.email || undefined,
      redirectUrl,
    };

    const widgetUrl = type === 'BUY'
      ? moonpayAPI.generateBuyUrl(params)
      : moonpayAPI.generateSellUrl(params);

    console.log(`[MoonPay] Generated ${type} URL for ${walletAddress}`);

    // Create pending transaction record
    // Note: We'll get the actual transaction ID from the webhook
    const transaction = await prisma.fiatTransaction.create({
      data: {
        userId: user.id,
        type,
        provider: 'MOONPAY',
        status: 'PENDING',
        fiatAmount: baseCurrencyAmount || 0,
        fiatCurrency: baseCurrency,
        cryptoAmount: 0, // Will be updated from webhook
        exchangeRate: 0,
        feeAmount: 0,
        notes: `MoonPay ${type} transaction initiated`,
      },
    });

    return NextResponse.json({
      success: true,
      widgetUrl,
      transactionId: transaction.id,
      type,
      message: 'Open the widgetUrl to complete the transaction',
    });

  } catch (error: any) {
    console.error('[API] Create MoonPay transaction error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create transaction',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
