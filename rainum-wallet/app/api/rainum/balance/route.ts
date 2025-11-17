/**
 * Rainum Balance API Route
 *
 * Get RAINUM balance for an address
 * GET /api/rainum/balance?address=<address>
 */

import { NextRequest, NextResponse } from 'next/server';
import { rainumAdminAPI, isValidRainumAddress } from '@/lib/rainum-admin-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    // Validation
    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidRainumAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Rainum address format' },
        { status: 400 }
      );
    }

    // Get balance from blockchain
    const balanceInfo = await rainumAdminAPI.getBalance(address);

    return NextResponse.json({
      success: true,
      address: balanceInfo.address,
      balance: balanceInfo.balance,
      currency: balanceInfo.currency,
    });

  } catch (error: any) {
    console.error('[Balance API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get balance',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
