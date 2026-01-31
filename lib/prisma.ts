import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.NODE_ENV === 'production' ? process.env.DATABASE_URL! : process.env.DIRECT_URL!

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000, // 10 seconds to acquire connection
    statement_timeout: 10000,       // 10 seconds for query execution
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


