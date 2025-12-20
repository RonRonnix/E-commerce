import { prisma } from './db'

async function main() {
  const test = await prisma.product.findUnique({ where: { slug: 'test' } })
  console.log('product test exists?', !!test, test?.id)
  const cats = await (prisma as any).category.findMany({ select: { id: true, name: true, slug: true } })
  console.log('categories:', cats)
}

main().finally(()=>prisma.$disconnect())
