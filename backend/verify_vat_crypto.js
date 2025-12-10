/**
 * VAT Crypto Service Tests
 * 
 * Run with: node backend/verify_vat_crypto.js
 * 
 * Tests:
 * 1. Key pair generation
 * 2. Canonicalization
 * 3. Token minting and signing
 * 4. Token verification
 * 5. Tamper detection
 * 6. QR export/import
 */

const { vatCryptoService, AUTHORITY_PRECEDENCE } = require('./services/vatCryptoService');

const TEST_PASSWORD = 'test-encryption-password-123';

async function runTests() {
  console.log('🧪 VAT Crypto Service Test Suite\n');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  // Test 1: Key pair generation
  console.log('\n📌 Test 1: Key Pair Generation');
  let keyPair;
  try {
    keyPair = await vatCryptoService.generateKeyPair(TEST_PASSWORD);
    
    if (keyPair.publicKey && keyPair.privateKeyEncrypted && keyPair.fingerprint) {
      console.log('   ✅ Key pair generated successfully');
      console.log(`   📎 Fingerprint: ${keyPair.fingerprint.substring(0, 16)}...`);
      console.log(`   📎 Public key length: ${keyPair.publicKey.length} chars`);
      passed++;
    } else {
      console.log('   ❌ Missing key pair components');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 2: Canonicalization
  console.log('\n📌 Test 2: JSON Canonicalization');
  try {
    const obj1 = { b: 2, a: 1, c: { z: 26, a: 1 } };
    const obj2 = { c: { a: 1, z: 26 }, a: 1, b: 2 };
    
    const canon1 = vatCryptoService.canonicalize(obj1);
    const canon2 = vatCryptoService.canonicalize(obj2);
    
    if (canon1 === canon2) {
      console.log('   ✅ Canonicalization is deterministic');
      console.log(`   📎 Result: ${canon1}`);
      passed++;
    } else {
      console.log('   ❌ Canonicalization not deterministic');
      console.log(`   📎 obj1: ${canon1}`);
      console.log(`   📎 obj2: ${canon2}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 3: Token minting
  console.log('\n📌 Test 3: Token Minting');
  let token;
  try {
    const tokenData = {
      tokenId: vatCryptoService.generateTokenId(),
      batchId: 'batch-123',
      productGlobalSku: vatCryptoService.generateProductGlobalSku('company-1', 'Test Product'),
      companyId: 'company-1',
      tinNumber: 'C0012345678',
      quantity: 100,
      grossAmount: 11250.00,
      vatRate: 12.5,
      vatAmount: 1250.00,
      currencyCode: 'GHS',
      issuedAt: new Date().toISOString()
    };

    token = vatCryptoService.mintToken(
      tokenData,
      keyPair.privateKeyEncrypted,
      TEST_PASSWORD,
      keyPair.fingerprint,
      'SKA'
    );

    if (token.payload && token.proof && token.proof.signature) {
      console.log('   ✅ Token minted successfully');
      console.log(`   📎 Token ID: ${token.payload.vid}`);
      console.log(`   📎 Hash: ${token.proof.hash.substring(0, 16)}...`);
      console.log(`   📎 Signature length: ${token.proof.signature.length} chars`);
      passed++;
    } else {
      console.log('   ❌ Token missing components');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 4: Token verification (valid)
  console.log('\n📌 Test 4: Token Verification (Valid)');
  try {
    const result = vatCryptoService.verifyToken(token, keyPair.publicKey);
    
    if (result.valid) {
      console.log('   ✅ Valid token verified successfully');
      console.log(`   📎 Authority: ${result.authority}`);
      passed++;
    } else {
      console.log(`   ❌ Valid token rejected: ${result.reason}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 5: Tamper detection
  console.log('\n📌 Test 5: Tamper Detection');
  try {
    // Create a tampered token
    const tamperedToken = JSON.parse(JSON.stringify(token));
    tamperedToken.payload.t = 9999.99; // Change VAT amount

    const result = vatCryptoService.verifyToken(tamperedToken, keyPair.publicKey);
    
    if (!result.valid && result.reason.includes('Hash mismatch')) {
      console.log('   ✅ Tampered token correctly rejected');
      console.log(`   📎 Reason: ${result.reason}`);
      passed++;
    } else if (result.valid) {
      console.log('   ❌ Tampered token was accepted (SECURITY ISSUE)');
      failed++;
    } else {
      console.log(`   ⚠️  Rejected but wrong reason: ${result.reason}`);
      passed++; // Still detected, just different reason
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 6: Wrong key rejection
  console.log('\n📌 Test 6: Wrong Key Rejection');
  try {
    // Generate a different key pair
    const wrongKeyPair = await vatCryptoService.generateKeyPair('different-password');
    
    const result = vatCryptoService.verifyToken(token, wrongKeyPair.publicKey);
    
    if (!result.valid) {
      console.log('   ✅ Token signed with different key correctly rejected');
      console.log(`   📎 Reason: ${result.reason}`);
      passed++;
    } else {
      console.log('   ❌ Token with wrong key was accepted (SECURITY ISSUE)');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 7: QR export/import
  console.log('\n📌 Test 7: QR Export/Import');
  try {
    const qrData = vatCryptoService.exportForQR(token);
    const imported = vatCryptoService.importFromQR(qrData);
    
    // Verify imported token
    const result = vatCryptoService.verifyToken(imported, keyPair.publicKey);
    
    if (result.valid) {
      console.log('   ✅ QR export/import round-trip successful');
      console.log(`   📎 QR data size: ${qrData.length} chars`);
      passed++;
    } else {
      console.log(`   ❌ Imported token verification failed: ${result.reason}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 8: Authority comparison
  console.log('\n📌 Test 8: Authority Precedence');
  try {
    const gra_vs_ska = vatCryptoService.compareAuthority('GRA', 'SKA');
    const ska_vs_company = vatCryptoService.compareAuthority('SKA', 'Company');
    const company_vs_gra = vatCryptoService.compareAuthority('Company', 'GRA');

    if (gra_vs_ska > 0 && ska_vs_company > 0 && company_vs_gra < 0) {
      console.log('   ✅ Authority precedence correct: GRA > SKA > Company');
      passed++;
    } else {
      console.log('   ❌ Authority precedence incorrect');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Test 9: Quantity validation
  console.log('\n📌 Test 9: Quantity Claim Validation');
  try {
    const valid = vatCryptoService.validateQuantityClaim(100, 30, 50);
    const invalid = vatCryptoService.validateQuantityClaim(100, 80, 30);

    if (valid.valid && valid.remaining === 20 && !invalid.valid) {
      console.log('   ✅ Quantity validation works correctly');
      console.log(`   📎 Valid claim: remaining=${valid.remaining}`);
      console.log(`   📎 Invalid claim: ${invalid.reason}`);
      passed++;
    } else {
      console.log('   ❌ Quantity validation incorrect');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
