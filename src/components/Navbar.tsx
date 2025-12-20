import { Link, NavLink } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useCart } from './CartContext'
import { useWishlist } from './WishlistContext'

export default function Navbar() {
  const { user } = useAuth()
  const { count } = useCart()
  const { count: wishCount } = useWishlist()
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="container-xl flex items-center gap-4 py-3">
        <Link to="/" className="font-semibold text-xl tracking-tight">cyber</Link>

        <nav className="ml-auto hidden md:flex items-center gap-6 text-sm text-gray-600">
          <NavLink to="/" className={({isActive}: {isActive: boolean}) => isActive ? 'text-black' : ''}>Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact Us</NavLink>
          {user && (user.roles.includes('admin') || user.roles.includes('owner')) && (
            <NavLink to="/admin">Admin</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3 ml-2">
          <Link to="/wishlist" aria-label="wishlist" className="relative p-2 rounded-md border hover:bg-gray-50 transition-all duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300">
            <span className="sr-only">wishlist</span>
            <Icon name={'heart'} />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-black text-white text-[11px] leading-5 text-center">{wishCount}</span>
            )}
          </Link>
          <Link to="/cart" aria-label="cart" className="relative p-2 rounded-md border hover:bg-gray-50 transition-all duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300">
            <span className="sr-only">cart</span>
            <Icon name={'cart'} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-black text-white text-[11px] leading-5 text-center">{count}</span>
            )}
          </Link>
          <Link to="/profile" aria-label="user" className="p-1.5 rounded-md border hover:bg-gray-50 transition-all duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="inline-flex h-7 w-7 items-center justify-center text-gray-600"><Icon name={'user'} /></span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

function Icon({ name }: { name: 'heart' | 'cart' | 'user' }) {
  if (name === 'heart') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>
    )
  }
  if (name === 'cart') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 12.39a2 2 0 002 1.61H19a2 2 0 002-1.61L23 6H6"/></svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )
}
