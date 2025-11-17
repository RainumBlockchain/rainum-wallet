/**
 * Fiat Transactions API Route
 *
 * Get fiat transaction history for a wallet address
 * GET /api/fiat/transactions?address=<address>
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validation
    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip: offset,
        },
      },
    });

    if (!user) {
      // Return empty array if user not found (they haven't done any fiat transactions yet)
      return NextResponse.json({
        success: true,
        transactions: [],
        total: 0,
      });
    }

    // Get total count
    const total = await prisma.fiatTransaction.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      transactions: user.transactions,
      total,
      limit,
      offset,
    });

  } catch (error: any) {
    console.error('[Transactions API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch transactions',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
