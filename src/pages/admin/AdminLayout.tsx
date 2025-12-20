import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r bg-white">
        <div className="px-5 py-4 text-xl font-semibold tracking-tight">cyber</div>
        <nav className="px-3 py-2 space-y-1 text-sm">
          <AdminLink to="/admin">Dashboard</AdminLink>
          <AdminLink to="/admin/products">All Products</AdminLink>
          <AdminLink to="/admin/orders">Order List</AdminLink>
          <AdminLink to="/admin/manage">Manage Orders</AdminLink>
        </nav>
      </aside>
      <main className="bg-gray-50">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="px-6 py-3">
            <div className="text-sm text-gray-500">Home › Dashboard</div>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function AdminLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `block px-3 py-2 rounded-md ${isActive ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
      end
    >
      {children}
    </NavLink>
  )
}
