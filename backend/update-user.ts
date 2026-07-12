import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();

async function main() {
  const email = 'mail.arsh.pathan@gmail.com';
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  // Make them admin, increase server limit, verify email
  const updated = await prisma.user.update({
    where: { email },
    data: {
      role: 'ADMIN',
      serverLimit: 100,
      emailVerified: true
    }
  });

  // Give them 10000 credits
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {
      balance: 10000
    },
    create: {
      userId: user.id,
      balance: 10000
    }
  });

  console.log('Successfully upgraded user:', updated.email);
  console.log('Role:', updated.role);
  console.log('Server Limit:', updated.serverLimit);
  console.log('Wallet Balance:', wallet.balance);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
