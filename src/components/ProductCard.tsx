import { Link } from 'react-router-dom'

type Product = {
  id: string
  title: string
  price: number
  image: string
}

export default function ProductCard({ product }: { product: Product }) {
  const pricePhp = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(product.price)
  return (
    <Link to={`/products/${product.id}`} className="block rounded-xl border bg-white shadow-card overflow-hidden transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer">
      <div className="aspect-square bg-gray-100">
        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="text-sm text-gray-500">New Arrival</div>
        <h3 className="font-medium leading-snug">{product.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-semibold">{pricePhp}</span>
          <span className="px-3 py-1.5 text-sm rounded-md border">View</span>
        </div>
      </div>
    </Link>
  )
}
