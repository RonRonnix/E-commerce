import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import ProfilePage from './pages/ProfilePage'
import { AuthProvider } from './components/AuthContext'
import RequireRole from './components/RequireRole'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import ProductsList from './pages/admin/ProductsList'
import ProductForm from './pages/admin/ProductForm'
import ProductPage from './pages/ProductPage'
import CatalogPage from './pages/CatalogPage'
import CartPage from './pages/CartPage'
import { ToasterProvider } from './components/Toaster'
import { CartProvider } from './components/CartContext'
import { WishlistProvider } from './components/WishlistContext'
import WishlistPage from './pages/WishlistPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentPage from './pages/PaymentPage'
import OrderDetailsPage from './pages/OrderDetailsPage'
import Orders from './pages/admin/Orders'
import UserOrders from './pages/admin/UserOrders'
import ManageOrders from './pages/admin/ManageOrders'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToasterProvider>
          <CartProvider>
            <WishlistProvider>
        <div className="min-h-full flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/products/:id" element={<ProductPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment/:id" element={<PaymentPage />} />
              <Route path="/orders/:id" element={<OrderDetailsPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route
                path="/admin/*"
                element={
                  <RequireRole roles={['admin','owner']}>
                    <AdminLayout />
                  </RequireRole>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<UserOrders />} />
                <Route path="manage" element={<ManageOrders />} />
                <Route path="products" element={<ProductsList />} />
                <Route path="products/:id" element={<ProductForm />} />
              </Route>
            </Routes>
          </main>
          <Footer />
        </div>
            </WishlistProvider>
          </CartProvider>
        </ToasterProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
