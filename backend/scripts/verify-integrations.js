import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env.js';
import { getStorageAdapter } from '../src/services/storage.service.js';
import nodemailer from 'nodemailer';

async function verifyIntegrations() {
  console.log('====================================================');
  console.log('   THAT JALTA DIYA: INTEGRATION VERIFICATION SUITE   ');
  console.log('====================================================\n');

  let allPassed = true;
  const sendEmailArgIndex = process.argv.indexOf('--send-test-email');
  const targetTestEmail = sendEmailArgIndex !== -1 ? process.argv[sendEmailArgIndex + 1] : null;

  // 1. Environment Variables Validation
  console.log('[1/5] Checking Environment Variables Configuration...');
  try {
    const requiredVars = [
      'DATABASE_URL',
      'DIRECT_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'COOKIE_SECRET',
    ];
    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.log(`  ❌ FAIL: Missing required environment variables: ${missing.join(', ')}`);
      allPassed = false;
    } else {
      console.log('  ✓ PASS: Core environment variables present and structurally valid');
    }
  } catch (err) {
    console.log(`  ❌ FAIL: Env parsing error: ${err.message}`);
    allPassed = false;
  }

  // 2. Database Connectivity: DATABASE_URL & DIRECT_URL
  console.log('\n[2/5] Testing Neon PostgreSQL Database Connections...');
  
  // Test Pooled URL
  const pooledPrisma = new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
  });
  try {
    const pooledResult = await pooledPrisma.$queryRaw`SELECT 1 as result`;
    if (pooledResult && pooledResult.length > 0) {
      console.log('  ✓ PASS: DATABASE_URL (Pooled / pgbouncer) connection responsive');
    } else {
      console.log('  ❌ FAIL: DATABASE_URL returned unexpected query result');
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌ FAIL: DATABASE_URL connection failed: ${err.message}`);
    allPassed = false;
  } finally {
    await pooledPrisma.$disconnect();
  }

  // Test Direct URL
  const directPrisma = new PrismaClient({
    datasources: { db: { url: env.DIRECT_URL } },
  });
  try {
    const directResult = await directPrisma.$queryRaw`SELECT 1 as result`;
    if (directResult && directResult.length > 0) {
      console.log('  ✓ PASS: DIRECT_URL (Direct compute connection) responsive');
    } else {
      console.log('  ❌ FAIL: DIRECT_URL returned unexpected query result');
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌ FAIL: DIRECT_URL connection failed: ${err.message}`);
    allPassed = false;
  } finally {
    await directPrisma.$disconnect();
  }

  // 3. Database Migrations Status
  console.log('\n[3/5] Verifying Database Schema Migrations...');
  const mainPrisma = new PrismaClient();
  try {
    const migrations = await mainPrisma.$queryRaw`
      SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5
    `;
    if (migrations && migrations.length > 0) {
      console.log(`  ✓ PASS: Found ${migrations.length} applied migrations. Latest: ${migrations[0].migration_name}`);
    } else {
      console.log('  ❌ FAIL: No applied migrations found in _prisma_migrations table');
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌ FAIL: Unable to query _prisma_migrations: ${err.message}`);
    allPassed = false;
  } finally {
    await mainPrisma.$disconnect();
  }

  // 4. Object Storage (Neon Object Storage / S3)
  console.log('\n[4/5] Testing Object Storage Integration (Upload -> Fetch -> Delete)...');
  try {
    const storage = getStorageAdapter();
    const testKey = `test-verify-${Date.now()}.txt`;
    const testBuffer = Buffer.from('That Jalta Diya storage integration probe', 'utf-8');

    // 4a. Upload test file
    const uploadRes = await storage.upload({
      key: testKey,
      body: testBuffer,
      contentType: 'text/plain',
      cacheControl: 'no-cache',
    });
    console.log(`  ✓ Uploaded test probe object with key: ${testKey}`);

    // 4b. Fetch test file over HTTP via STORAGE_PUBLIC_BASE_URL (if configured)
    if (env.STORAGE_PUBLIC_BASE_URL && uploadRes.url.startsWith('http')) {
      const fetchRes = await fetch(uploadRes.url);
      if (fetchRes.ok) {
        console.log(`  ✓ PASS: Public fetch confirmed over HTTP from ${uploadRes.url} (Status: ${fetchRes.status})`);
      } else {
        console.log(`  ❌ FAIL: Public fetch failed from ${uploadRes.url} (Status: ${fetchRes.status})`);
        allPassed = false;
      }
    } else {
      console.log(`  ℹ Local development storage verified at ${uploadRes.url}`);
    }

    // 4c. Delete test file
    const deleted = await storage.delete(testKey);
    if (deleted) {
      console.log('  ✓ PASS: Successfully deleted test object');
    } else {
      console.log('  ❌ FAIL: Failed to delete test object');
      allPassed = false;
    }
  } catch (err) {
    console.log(`  ❌ FAIL: Storage operation failed: ${err.message}`);
    allPassed = false;
  }

  // 5. Email Configuration
  console.log('\n[5/5] Checking Email Deliverability Settings...');

  // Email check
  const hasSmtp = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  const hasResend = Boolean(env.RESEND_API_KEY);

  if (hasSmtp || hasResend) {
    console.log(`  ✓ PASS: Email service configured (${hasResend ? 'Resend' : `SMTP: ${env.SMTP_HOST}`})`);

    if (targetTestEmail) {
      console.log(`  📧 Sending live test email to: ${targetTestEmail}...`);
      try {
        const transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: env.EMAIL_FROM,
          to: targetTestEmail,
          subject: 'That Jalta Diya Integration Test',
          text: 'Integration verification test email sent successfully.',
        });
        console.log('  ✓ PASS: Test email dispatched successfully');
      } catch (emailErr) {
        console.log(`  ❌ FAIL: Failed to send test email: ${emailErr.message}`);
        allPassed = false;
      }
    } else {
      console.log('  ℹ Tip: Run with --send-test-email your-email@example.com to test live sending');
    }
  } else {
    console.log('  ℹ NOTICE: Email credentials not configured yet (falls back to console log in dev)');
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('  ✨ ALL INTEGRATIONS VERIFIED SUCCESSFULLY!');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('  ❌ ONE OR MORE INTEGRATION CHECKS FAILED.');
    console.log('====================================================\n');
    process.exit(1);
  }
}

verifyIntegrations().catch((err) => {
  console.error('\nFatal error during integration verification:', err);
  process.exit(1);
});
