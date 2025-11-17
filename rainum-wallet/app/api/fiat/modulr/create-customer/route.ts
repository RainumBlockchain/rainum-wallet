/**
 * Modulr Create Customer API Route
 *
 * Creates a new customer in Modulr and links it to a Rainum wallet address
 * POST /api/fiat/modulr/create-customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { modulrAPI, type CreateCustomerParams } from '@/lib/modulr-api';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      walletAddress,
      type,
      firstName,
      lastName,
      companyName,
      email,
      phone,
      dateOfBirth,
      address,
    } = body;

    // Validation
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!address || !address.addressLine1 || !address.city || !address.postcode || !address.country) {
      return NextResponse.json(
        { error: 'Complete address is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    // If user already has Modulr customer, return existing
    if (user?.modulrCustomerId) {
      const modulrCustomer = await modulrAPI.getCustomer(user.modulrCustomerId);

      return NextResponse.json({
        success: true,
        existing: true,
        customerId: user.modulrCustomerId,
        accountId: user.modulrAccountId,
        customer: modulrCustomer,
      });
    }

    // Create customer in Modulr
    const customerParams: CreateCustomerParams = {
      type: type || 'PERSON',
      firstName,
      lastName,
      companyName,
      email,
      phone,
      dateOfBirth,
      address,
    };

    const modulrCustomer = await modulrAPI.createCustomer(customerParams);

    // Create account for the customer
    const modulrAccount = await modulrAPI.createAccount({
      customerId: modulrCustomer.id,
      name: `${firstName || companyName} - Rainum Account`,
      currency: 'EUR',
    });

    // Create or update user in database
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          modulrCustomerId: modulrCustomer.id,
          modulrAccountId: modulrAccount.id,
          kycStatus: modulrCustomer.verified ? 'VERIFIED' : 'PENDING',
          kycProvider: 'modulr',
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          walletAddress,
          email,
          modulrCustomerId: modulrCustomer.id,
          modulrAccountId: modulrAccount.id,
          kycStatus: modulrCustomer.verified ? 'VERIFIED' : 'PENDING',
          kycProvider: 'modulr',
        },
      });
    }

    return NextResponse.json({
      success: true,
      customerId: modulrCustomer.id,
      accountId: modulrAccount.id,
      accountNumber: modulrAccount.accountNumber,
      sortCode: modulrAccount.sortCode,
      iban: modulrAccount.iban,
      bic: modulrAccount.bic,
      customer: modulrCustomer,
      kycStatus: user.kycStatus,
    });

  } catch (error: any) {
    console.error('[API] Create customer error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create customer',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
