/**
 * MoonPay Get Quote API Route
 *
 * Get a price quote for buying/selling crypto via MoonPay
 * GET /api/fiat/moonpay/get-quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { moonpayAPI, calculateRainumFromUSDC } from '@/lib/moonpay-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const baseCurrency = searchParams.get('baseCurrency') || 'EUR';
    const baseCurrencyAmount = parseFloat(searchParams.get('baseCurrencyAmount') || '100');

    // Validation
    if (baseCurrencyAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get quote from MoonPay for USDC (since they don't support custom tokens)
    const quote = await moonpayAPI.getQuote({
      baseCurrency,
      quoteCurrency: 'USDC',
      baseCurrencyAmount,
    });

    // Calculate equivalent RAINUM amount
    const rainumAmount = calculateRainumFromUSDC(quote.quoteCurrencyAmount);
    const rainumExchangeRate = rainumAmount / baseCurrencyAmount;

    return NextResponse.json({
      success: true,
      quote: {
        baseCurrency: quote.baseCurrency,
        baseCurrencyAmount: quote.baseCurrencyAmount,
        quoteCurrency: 'RAINUM',
        quoteCurrencyAmount: rainumAmount,
        usdcAmount: quote.quoteCurrencyAmount,
        exchangeRate: rainumExchangeRate,
        feeAmount: quote.feeAmount,
        extraFeeAmount: quote.extraFeeAmount,
        networkFeeAmount: quote.networkFeeAmount,
        totalAmount: quote.totalAmount,
      },
    });

  } catch (error: any) {
    console.error('[API] Get MoonPay quote error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get quote',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
