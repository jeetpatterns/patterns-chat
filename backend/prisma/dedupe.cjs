const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Cleaning up any existing duplicate email messages before schema push...');
    const deletedCount = await prisma.$executeRawUnsafe(`
      DELETE FROM email_messages a USING email_messages b
      WHERE a.id < b.id 
        AND a."accountId" = b."accountId" 
        AND a."externalMessageId" = b."externalMessageId";
    `);
    console.log(`Cleaned up ${deletedCount} duplicate messages successfully.`);
  } catch (err) {
    console.warn('Deduplicate script notice:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
