import { PrismaClient } from '@prisma/client';

// In production suppress verbose query logs. Prisma errors never include
// the connection string in the message exposed to application code.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
