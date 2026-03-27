import { env as envPrivate } from "$env/dynamic/private";
import { PrismaClient } from "$generated/prisma";

const { DATABASE_URL } = envPrivate;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    datasourceUrl: DATABASE_URL
  });

global.prisma = prisma;

export default prisma;
