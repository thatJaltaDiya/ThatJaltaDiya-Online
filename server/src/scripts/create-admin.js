import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { prisma } from '../config/prisma.js';
import { hashPassword } from '../utils/password.js';
import { passwordSchema } from '../validators/auth.validators.js';

async function main() {
  console.log('--- THAT JALTA DIYA: Secure Admin Account Setup ---');

  let adminEmail = process.env.ADMIN_EMAIL;
  let adminPassword = process.env.ADMIN_PASSWORD;
  let adminName = process.env.ADMIN_NAME || 'Store Owner';

  if (!adminEmail || !adminPassword) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!adminEmail) {
        adminEmail = await rl.question('Enter Admin Email: ');
      }
      if (!adminPassword) {
        adminPassword = await rl.question('Enter Admin Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number): ');
      }
    } finally {
      rl.close();
    }
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

  // Validate password strength
  const passValidation = passwordSchema.safeParse(adminPassword);
  if (!passValidation.success) {
    console.error('Password does not meet security requirements:');
    passValidation.error.errors.forEach(e => console.error(`- ${e.message}`));
    process.exit(1);
  }

  const passwordHash = await hashPassword(adminPassword);

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (existingAdmin && existingAdmin.email !== normalizedEmail) {
    console.log(`An admin account currently exists for (${existingAdmin.email}). Updating to (${normalizedEmail})...`);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        email: normalizedEmail,
        passwordHash,
        name: adminName,
        isEmailVerified: true,
        isBlocked: false,
        isDeleted: false,
      }
    });
    console.log(`Admin credentials updated successfully for ${normalizedEmail}.`);
  } else if (existingAdmin && existingAdmin.email === normalizedEmail) {
    console.log(`Updating existing admin account (${normalizedEmail})...`);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        name: adminName,
        isEmailVerified: true,
        isBlocked: false,
        isDeleted: false,
      }
    });
    console.log(`Admin password updated successfully for ${normalizedEmail}.`);
  } else {
    console.log(`Creating initial single-admin account for ${normalizedEmail}...`);
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: adminName,
        role: 'ADMIN',
        isEmailVerified: true,
        isPhoneVerified: true,
        cart: { create: {} },
        wishlist: { create: {} },
      }
    });
    console.log(`Single admin account created successfully for ${normalizedEmail}.`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error during admin creation:', err);
  process.exit(1);
});
