#!/usr/bin/env node

import { ethers } from 'ethers';

console.log('🚀 Starting transaction stress test with signatures...');
console.log('📊 Configuration: 150 transactions every 20 seconds for 10 minutes');
console.log('📈 Total: ~4500 transactions\n');

// Generate 100 test wallets
const wallets = [];
for (let i = 0; i < 100; i++) {
  const wallet = ethers.Wallet.createRandom();
  wallets.push(wallet);
}

console.log(`✅ Generated ${wallets.length} test wallets`);
console.log(`📝 Sample address: ${wallets[0].address}\n`);

// Fund all wallets with faucet
console.log('💰 Funding all test wallets...');
for (let i = 0; i < wallets.length; i++) {
  try {
    await fetch('http://localhost:8080/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: wallets[i].address })
    });

    if ((i + 1) % 20 === 0) {
      console.log(`   Funded ${i + 1}/${wallets.length} wallets...`);
    }
  } catch (error) {
    console.error(`Failed to fund wallet ${i}:`, error.message);
  }
}
console.log(`✅ All ${wallets.length} wallets funded!\n`);

// Wait a bit for faucet transactions to process
await new Promise(resolve => setTimeout(resolve, 2000));

// Function to create signed transaction
async function createSignedTransaction(fromWallet, toAddress, amount) {
  const nonce = Date.now();

  // Create transaction object
  const tx = {
    from: fromWallet.address,
    to: toAddress,
    amount: amount.toString(),
    nonce: nonce.toString()
  };

  // Create message to sign (same format as wallet)
  const message = `${tx.from}${tx.to}${tx.amount}${tx.nonce}`;

  // Sign the message
  const signature = await fromWallet.signMessage(message);

  return {
    ...tx,
    signature
  };
}

// Function to send transaction
async function sendTransaction(signedTx) {
  try {
    const response = await fetch('http://localhost:8080/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Run stress test
const BATCHES = 30;
const TX_PER_BATCH = 150;
const INTERVAL_MS = 20000;

let totalSuccess = 0;
let totalFailed = 0;

for (let batch = 1; batch <= BATCHES; batch++) {
  const batchStart = Date.now();
  console.log(`\n⏱️  Batch ${batch}/${BATCHES} - Sending ${TX_PER_BATCH} signed transactions...`);

  const promises = [];

  for (let i = 0; i < TX_PER_BATCH; i++) {
    // Random sender and receiver from our wallet pool
    const fromWallet = wallets[Math.floor(Math.random() * wallets.length)];
    const toWallet = wallets[Math.floor(Math.random() * wallets.length)];

    // Random amount between 1-100 RAIN
    const amount = Math.floor(Math.random() * 100) + 1;

    // Create and send signed transaction
    const promise = createSignedTransaction(fromWallet, toWallet.address, amount)
      .then(signedTx => sendTransaction(signedTx))
      .then(result => {
        if (result.success) {
          totalSuccess++;
        } else {
          totalFailed++;
        }
        return result;
      })
      .catch(error => {
        totalFailed++;
        return { success: false, error: error.message };
      });

    promises.push(promise);
  }

  // Wait for all transactions in this batch
  await Promise.all(promises);

  const batchDuration = Date.now() - batchStart;
  console.log(`   ✅ Batch ${batch} complete in ${(batchDuration / 1000).toFixed(2)}s`);
  console.log(`   📊 Success: ${totalSuccess} | Failed: ${totalFailed} | Total: ${totalSuccess + totalFailed}`);

  // Wait before next batch (unless it's the last batch)
  if (batch < BATCHES) {
    const waitTime = Math.max(0, INTERVAL_MS - batchDuration);
    if (waitTime > 0) {
      console.log(`   ⏳ Waiting ${(waitTime / 1000).toFixed(1)}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

console.log('\n\n🎉 Stress test complete!');
console.log('═══════════════════════════════════');
console.log(`✅ Successful: ${totalSuccess}`);
console.log(`❌ Failed: ${totalFailed}`);
console.log(`📊 Total: ${totalSuccess + totalFailed}`);
console.log(`📈 Success rate: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(2)}%`);
console.log('═══════════════════════════════════\n');

// Fetch final blockchain status
try {
  const statusResponse = await fetch('http://localhost:8080/status');
  const status = await statusResponse.json();

  console.log('📊 Final Blockchain Status:');
  console.log(`   Blocks: ${status.total_blocks}`);
  console.log(`   Transactions: ${status.total_transactions}`);
  console.log(`   Active Validators: ${status.active_validators}`);
  console.log(`   Peak TPS: ${status.peak_tps || 'N/A'}`);
} catch (error) {
  console.error('Failed to fetch final status:', error.message);
}
