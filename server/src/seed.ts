import 'dotenv/config'
import { prisma } from './db'

async function main() {
  // Seed roles
  const roleNames = ['customer', 'admin', 'owner']
  for (const name of roleNames) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } })
  }

  // Ensure categories exist (PC store theme)
  const pAny = prisma as any
  const categories: Array<{ name: string; slug: string }> = [
    { name: 'CPU', slug: 'cpu' },
    { name: 'Graphics Cards', slug: 'graphics-cards' },
    { name: 'RAM', slug: 'ram' },
    { name: 'Motherboard', slug: 'motherboard' },
    { name: 'Storage (SSD/HDD)', slug: 'storage' },
    { name: 'Power Supply', slug: 'power-supply' },
    { name: 'Monitors', slug: 'monitors' },
  ]
  for (const c of categories) {
    await pAny.category.upsert({ where: { slug: c.slug }, update: { name: c.name }, create: c })
  }

  const count = await prisma.product.count()
  if (count > 0) {
    console.log('Products already exist, skipping seed')
  } else {
    // Optionally seed a few example items (kept generic)
    const cpu = await pAny.category.findUnique({ where: { slug: 'cpu' } })
    const gpu = await pAny.category.findUnique({ where: { slug: 'graphics-cards' } })
    const ram = await pAny.category.findUnique({ where: { slug: 'ram' } })

    await prisma.product.create({ data: { title: 'Ryzen 7 7800X3D', slug: 'ryzen-7-7800x3d', brand: 'AMD', specs: 'Socket: AM5; Cores: 8; Threads: 16; Base Clock: 4.2GHz', priceCents: BigInt(185000), imageUrl: 'https://picsum.photos/seed/cpu1/600/600', category: { connect: { id: cpu.id } } } as any })
    await prisma.product.create({ data: { title: 'GeForce RTX 4070 Super', slug: 'geforce-rtx-4070-super', brand: 'NVIDIA', specs: 'Memory: 12GB GDDR6X; Boost Clock: 2.5GHz', priceCents: BigInt(349900), imageUrl: 'https://picsum.photos/seed/gpu1/600/600', category: { connect: { id: gpu.id } } } as any })
    await prisma.product.create({ data: { title: 'Corsair Vengeance 32GB DDR5', slug: 'corsair-vengeance-32gb-ddr5', brand: 'Corsair', specs: 'Capacity: 32GB; Speed: 6000MT/s; Type: DDR5', priceCents: BigInt(69900), imageUrl: 'https://picsum.photos/seed/ram1/600/600', category: { connect: { id: ram.id } } } as any })
    console.log('Seeded categories and products')
  }

  // Seed a demo customer if none exists
  const demoEmail = 'demo@customer.local'
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } })
  if (!existing) {
    const user = await prisma.user.create({ data: { email: demoEmail, passwordHash: 'dev-only', fullName: 'Demo Customer' } })
    const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'customer' } })
    await prisma.userRole.create({ data: { userId: user.id, roleId: customerRole.id } })
    console.log('Seeded demo customer (no real password)')
  }
}

main().finally(async () => prisma.$disconnect())
