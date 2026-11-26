import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('==================================================');
  console.log(' THAT JALTA DIYA: EMERGENCY ADMIN 2FA RECOVERY CLI');
  console.log('==================================================\n');

  let email = process.env.ADMIN_EMAIL;

  if (!email) {
    const rl = readline.createInterface({ input, output });
    try {
      email = await rl.question('Enter Admin Email to reset 2FA: ');
    } finally {
      rl.close();
    }
  }

  const normalizedEmail = (email || '').trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.role !== 'ADMIN') {
    console.error(`❌ Error: No admin user found with email "${normalizedEmail}".`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  // Audit log recovery event
  await prisma.auditLog.create({
    data: {
      adminId: user.id,
      action: 'ADMIN_2FA_RESET_CLI',
      targetType: 'User',
      targetId: user.id,
      details: { email: normalizedEmail, source: 'CLI' },
    },
  });

  console.log(`\n✓ SUCCESS: 2FA has been disabled for admin account: ${normalizedEmail}`);
  console.log('  The administrator can now log in using password and re-enroll in Settings.\n');
}

main()
  .catch((e) => {
    console.error('Fatal recovery error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
