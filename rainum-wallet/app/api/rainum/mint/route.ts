/**
 * Rainum Admin Mint API Route
 *
 * Mints RAINUM tokens to a specified address
 * POST /api/rainum/mint
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

  // Support both "Bearer TOKEN" and "TOKEN" formats
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

    console.log(`[Admin Mint] Minting ${formattedAmount} RAINUM to ${address}`);

    // Call blockchain mint API
    const result = await rainumAdminAPI.mint({
      address,
      amount: formattedAmount,
      memo: memo || 'Admin mint operation',
    });

    // Log the mint operation in audit trail
    // (You could add an AuditLog table to track admin operations)
    console.log(`[Admin Mint] ✓ Success: ${result.txHash}`);

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      address,
      amount: formattedAmount,
      blockHeight: result.blockHeight,
      timestamp: result.timestamp,
    });

  } catch (error: any) {
    console.error('[Admin Mint] Error:', error);

    return NextResponse.json(
      {
        error: 'Mint operation failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
