import { prisma } from '../db'

async function main() {
  const [roleName, email] = process.argv.slice(2)
  if (!roleName || !email) {
    console.error('Usage: tsx src/tools/grantRole.ts <admin|owner> <email>')
    process.exit(1)
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error(`User not found: ${email}`)
  const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  })
  console.log(`Granted role '${roleName}' to ${email}`)
}

main().catch((e)=>{
  console.error(e)
  process.exit(1)
}).finally(()=>prisma.$disconnect())
