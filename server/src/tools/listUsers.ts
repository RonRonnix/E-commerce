import { prisma } from '../db'

async function main() {
  const users = await prisma.user.findMany({ include: { roles: { include: { role: true } } } })
  for (const u of users) {
    console.log(`${u.id}\t${u.email}\t[${u.roles.map(r=>r.role.name).join(', ')}]`)
  }
}

main().catch(e=>{console.error(e); process.exit(1)}).finally(()=>prisma.$disconnect())
