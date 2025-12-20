export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">About Cyber Components</h1>
        <p className="text-gray-700 leading-relaxed">
          Cyber Components is a focused e‑commerce platform built for PC builders, IT professionals, and performance enthusiasts. We curate quality computer parts—CPUs, GPUs, motherboards, memory, storage, cases, cooling, peripherals, and power—to make upgrading or building a system straightforward and trustworthy.
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h2 className="text-xl font-medium">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed">Deliver reliable components with transparent specs and pricing, fast fulfillment, and responsive human support—so you spend more time creating and less time troubleshooting.</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-medium">What We Offer</h2>
          <ul className="list-disc ml-5 text-gray-700 space-y-1">
            <li>Up‑to‑date product inventory and real pricing</li>
            <li>Clear specifications and compatibility hints</li>
            <li>Bundles for common build profiles (gaming, creator, workstation)</li>
            <li>Wishlist & persistent cart for planning future upgrades</li>
            <li>Order tracking and status transparency</li>
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Why Choose Us</h3>
          <p className="text-gray-700 text-sm leading-relaxed">Curated parts, clear compatibility, and no inflated pricing—just components we would use ourselves.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Support First</h3>
          <p className="text-gray-700 text-sm leading-relaxed">Need guidance? Our support responds with actionable answers—not canned responses.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Secure Checkout</h3>
          <p className="text-gray-700 text-sm leading-relaxed">Encrypted payment flow, order confirmations, and optional account history for future builds.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Logistics & Reliability</h2>
        <p className="text-gray-700 leading-relaxed">We prioritize safe packaging, accurate pick & pack, and status updates at each step. Paid, picked, shipped, delivered—each state is tracked so you know exactly where your order stands.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Sustainability & Lifecycle</h2>
        <p className="text-gray-700 leading-relaxed">We encourage reuse: responsible e‑waste handling and upgrade paths that extend the life of your existing hardware. Fewer full rebuilds, smarter incremental improvements.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Looking Ahead</h2>
        <p className="text-gray-700 leading-relaxed">Upcoming enhancements include real‑time stock visibility, recommended compatibility clusters, and advanced performance build wizards. As we grow, transparency and trust remain our core value.</p>
      </section>

      <section className="text-center space-y-3 pt-4">
        <h2 className="text-2xl font-semibold">Build With Confidence</h2>
        <p className="text-gray-700">Explore components, plan upgrades, and place orders knowing each item is vetted.</p>
        <a href="/catalog" className="inline-block mt-2 px-5 py-3 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-900 transition-colors">Browse Catalog</a>
      </section>
    </div>
  )
}
