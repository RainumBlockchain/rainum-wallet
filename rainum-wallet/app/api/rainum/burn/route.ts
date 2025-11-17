/**
 * Rainum Admin Burn API Route
 *
 * Burns RAINUM tokens from a specified address
 * POST /api/rainum/burn
 *
 * IMPORTANT: This is an admin-only endpoint - requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { rainumAdminAPI, isValidRainumAddress, formatRainumAmount } from '@/lib/rainum-admin-api';
import { prisma } from '@/lib/prisma';

// Admin authentication middleware
function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.RAINUM_ADMIN_API_KEY;

  if (!authHeader || !adminKey) {
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  return token === adminKey;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { address, amount, memo } = body;

    // Validation
    if (!address || !amount) {
      return NextResponse.json(
        { error: 'Address and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!isValidRainumAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid Rainum address format' },
        { status: 400 }
      );
    }

    // Format amount to proper decimals
    const formattedAmount = formatRainumAmount(amount);

    // Optional: Check if address has sufficient balance before burning
    try {
      const balanceInfo = await rainumAdminAPI.getBalance(address);
      if (balanceInfo.balance < formattedAmount) {
        return NextResponse.json(
          {
            error: 'Insufficient balance',
            available: balanceInfo.balance,
            requested: formattedAmount,
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.warn('[Admin Burn] Could not verify balance, proceeding anyway');
    }

    console.log(`[Admin Burn] Burning ${formattedAmount} RAINUM from ${address}`);

    // Call blockchain burn API
    const result = await rainumAdminAPI.burn({
      address,
      amount: formattedAmount,
      memo: memo || 'Admin burn operation',
    });

    // Log the burn operation in audit trail
    console.log(`[Admin Burn] ✓ Success: ${result.txHash}`);

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      address,
      amount: formattedAmount,
      blockHeight: result.blockHeight,
      timestamp: result.timestamp,
    });

  } catch (error: any) {
    console.error('[Admin Burn] Error:', error);

    return NextResponse.json(
      {
        error: 'Burn operation failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
