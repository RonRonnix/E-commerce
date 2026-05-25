import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function PaymentSuccessPage() {
  const nav = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      nav('/profile')
    }, 3000)

    return () => clearTimeout(timer)
  }, [nav])

  return (
    <section className="container-xl py-12">
      <div className="max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Payment successful</h1>
        <p className="mt-2 text-sm text-gray-600">
          Thanks for your order. You will be redirected to your profile in 3 seconds.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/profile"
            className="px-4 py-2 rounded-md bg-black text-white cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95"
          >
            Go to Profile
          </Link>
          <Link
            to="/orders"
            className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95"
          >
            View Orders
          </Link>
        </div>
      </div>
    </section>
  )
}
