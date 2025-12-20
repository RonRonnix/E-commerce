import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

// Use a single specific hero image: place one file named "hero" in assets/images (e.g., hero.jpg or hero.webp)
const heroCandidates = import.meta.glob("../assets/images/5070.{png,jpg,jpeg,webp,avif}", { eager: true, as: "url" }) as Record<string, string>
const heroUrl: string | undefined = Object.values(heroCandidates)[0]

// Category icons loader: place files in assets/images/Category-icons.
// Recommended naming: use the category slug in the filename, e.g., cpu.png, graphics-cards.svg
const catIconFiles = import.meta.glob("../assets/images/Category-icons/*.{png,jpg,jpeg,webp,svg}", { eager: true, as: "url" }) as Record<string, string>
function getCatIcon(slugOrName: string): string | undefined {
  const target = slugOrName.toLowerCase().replace(/\s+/g,'-')
  const entries = Object.entries(catIconFiles)
  // exact slug match in filename
  const exact = entries.find(([path]) => new RegExp(`(^|\\/|-)${target}(?:\\.|$)`, 'i').test(path))
  if (exact) return exact[1]
  // loose includes match
  const loose = entries.find(([path]) => path.toLowerCase().includes(target))
  return loose?.[1]
}

// Homepage promo images from assets/images/Homepage-images
const homeImgFiles = import.meta.glob("../assets/images/Homepage-images/*.{png,jpg,jpeg,webp,avif,svg}", { eager: true, as: "url" }) as Record<string, string>
function getHomeImg(name: string): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const target = norm(name)
  const entries = Object.entries(homeImgFiles)
  // exact normalized base-name match
  const exact = entries.find(([p]) => {
    const base = p.split('/').pop() || ''
    const noExt = base.replace(/\.[a-z0-9]+$/i, '')
    return norm(noExt) === target
  })
  if (exact) return exact[1]
  // loose includes as fallback
  const loose = entries.find(([p]) => p.toLowerCase().includes(target))
  return loose?.[1]
}

const sampleProducts = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i + 1),
  title: [
    "Apple iPhone 14 Pro Max 128GB",
    "Blackmagic Pocket Cinema Camera 6K",
    "Apple Watch Series 9 GPS 41mm",
    "AirPods Max Silver",
    "Samsung Galaxy Watch 6 47mm",
    "Galaxy Z Fold5 Phantom Black",
    "Galaxy Buds FE Graphite",
    "Apple iPad 10.2" ,
  ][i % 8] || `Product ${i + 1}`,
  price: [900, 2535, 399, 549, 369, 1799, 99.99, 399][i % 8] as number,
  image: `https://picsum.photos/seed/p${i}/600/600`,
}));

type ApiProduct = { id: string; title: string; priceCents: number; imageUrl?: string };

export default function HomePage() {
  const [apiProducts, setApiProducts] = useState<ApiProduct[] | null>(null);
  const [categories, setCategories] = useState<Array<{id:string;name:string;slug:string}>>([])
  const catScrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateCatScrollButtons() {
    const el = catScrollerRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < maxScroll - 1)
  }

  function scrollCategories(dir: 'left' | 'right') {
    const el = catScrollerRef.current
    if (!el) return
    const amount = Math.round(el.clientWidth * 0.9)
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }
  useEffect(() => {
    let cancelled = false;
    fetch('/api/products')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Bad response')))
      .then((data: ApiProduct[]) => { if (!cancelled) setApiProducts(data) })
      .catch(() => { if (!cancelled) setApiProducts([]) })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    fetch('/api/categories').then(r=>r.ok?r.json():[]).then(setCategories).catch(()=>{})
  }, [])
  useEffect(() => {
    // Recompute arrow states when categories load/resize and install wheel-to-horizontal behavior
    updateCatScrollButtons()
    const el = catScrollerRef.current
    if (!el) return
    const onScroll = () => updateCatScrollButtons()
    const onResize = () => updateCatScrollButtons()
    const onWheel = (e: WheelEvent) => {
      // If there's horizontal overflow, translate vertical wheel to horizontal scroll and prevent inner vertical scroll
      if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('scroll', onScroll)
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel as any)
      window.removeEventListener('resize', onResize)
    }
  }, [categories.length])
  return (
    <div>
      <Hero />

      {/* Browse by Category */}
      <section className="container-xl py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Browse By Category</h2>
          <div className="flex gap-2">
            <button
              className="p-2 rounded-full border cursor-pointer transition-transform duration-150 hover:scale-[1.06] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => scrollCategories('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll categories left"
            >
              ‹
            </button>
            <button
              className="p-2 rounded-full border cursor-pointer transition-transform duration-150 hover:scale-[1.06] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => scrollCategories('right')}
              disabled={!canScrollRight}
              aria-label="Scroll categories right"
            >
              ›
            </button>
          </div>
        </div>
        <div ref={catScrollerRef} className="overflow-x-auto overflow-y-hidden overscroll-x-contain no-scrollbar">
          <div className="flex gap-4 snap-x snap-mandatory">
            {(
              categories.length > 0
                ? categories.map(c => ({ name: c.name, slug: c.slug }))
                : [
                    { name: "CPU", slug: "cpu" },
                    { name: "Graphics Cards", slug: "graphics-cards" },
                    { name: "RAM", slug: "ram" },
                    { name: "Motherboard", slug: "motherboard" },
                    { name: "Storage (SSD/HDD)", slug: "storage-ssd-hdd" },
                    { name: "Power Supply", slug: "power-supply" },
                    { name: "Monitors", slug: "monitors" },
                  ]
            ).map(cat => (
              <Link
                key={cat.slug}
                to={`/catalog?category=${encodeURIComponent(cat.slug)}`}
                className="snap-start min-w-[220px] sm:min-w-[260px] rounded-xl border bg-white shadow-card cursor-pointer group"
              >
                <div className="p-6 text-center transition-transform duration-150 group-hover:scale-[1.15] group-active:scale-95 transform-gpu">
                  {(() => {
                    const src = getCatIcon(cat.slug || cat.name)
                    return src ? (
                      <img src={src} alt={cat.name} className="mx-auto h-10 w-10 object-contain mb-3" />
                    ) : (
                      <div className="mx-auto h-10 w-10 rounded-lg bg-gray-100 mb-3" />
                    )
                  })()}
                  <div className="text-sm text-gray-600">{cat.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrival grid to match the cards layout */}
      <section className="container-xl py-8">
        <div className="mb-4 flex gap-4 text-sm">
          <button className="font-medium">New Arrival</button>
          <button className="text-gray-500">Bestseller</button>
          <button className="text-gray-500">Featured Products</button>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {(apiProducts && apiProducts.length > 0 ? apiProducts.map(p => ({
            id: p.id,
            title: p.title,
            price: Math.round((p.priceCents ?? 0) / 100),
            image: p.imageUrl ?? `https://picsum.photos/seed/${p.id}/600/600`
          })) : sampleProducts)
            .slice(0, 8)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>

      {/* Promo band with 4 tiles */}
      <section className="container-xl py-10">
        <h2 className="text-xl font-semibold mb-6">Browse More</h2>
        <div className="grid md:grid-cols-2 gap-6">
        <PromoTile
          title={<><span className="text-gray-800">Ryzen</span> <span className="font-semibold">CPU's</span></>}
          body="Incredibly powerful CPUs for your next newly bought triple AAA Games."
          image={getHomeImg('Ryzen CPUs') ?? "https://picsum.photos/seed/ps5/900/600"}
        />
        <PromoTile
          title={<><span className="text-gray-800">Nvidia</span> <span className="font-semibold">GPU's</span></>}
          body="Boost your FPS with the latest graphics technology by NVIDIA doubling your gaming experience."
          image={getHomeImg('Nvidia GPUs') ?? "https://picsum.photos/seed/macair/900/600"}
          align="right"
        />
        <PromoTile
          title={<><span className="text-gray-800">Asus 240 HZ</span> <span className="font-semibold">Monitors</span></>}
          body="Immerse yourself in the world of high refresh rates and stunning visuals."
          image={getHomeImg('Asus 240 HZ Monitors') ?? "https://picsum.photos/seed/vision/900/600"}
          small
        />
        <PromoTile
          title={<><span className="text-gray-800">M.2</span> <span className="font-semibold">SSD's</span></>}
          body="Fast, Efficient, and Reliable storage solutions for all your needs."
          image={getHomeImg('M.2 SSDs') ?? "https://picsum.photos/seed/airmax/900/600"}
          small
        />
        </div>
      </section>

      {/* Discounts grid */}
      <section className="container-xl py-12">
        <h2 className="text-xl font-semibold mb-6">Discounts up to -50%</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {(
            apiProducts && apiProducts.length > 0
              ? apiProducts.map(p => ({ id: p.id, title: p.title, price: Math.round((p.priceCents ?? 0)/100), image: p.imageUrl ?? `https://picsum.photos/seed/${p.id}/600/600` }))
              : sampleProducts
          ).slice(0,4).map((p) => (
            <ProductCard key={`d-${p.id}`} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-[var(--accent)] text-white">
      <div className="container-xl grid md:grid-cols-2 items-center gap-8 py-14">
        <div>
          <div className="text-sm text-gray-300">The Beast at Home</div>
          <h1 className="text-4xl md:text-6xl font-light tracking-tight mt-2">RTX<span className="font-semibold"> 5070</span></h1>
          <p className="text-gray-300 mt-4 max-w-md">Created to change everything for the better. For everyone</p>
          <Link to="/catalog" className="inline-block mt-6 px-5 py-2 rounded-md bg-white text-black transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer">Shop Now</Link>
        </div>
        <div className="aspect-[4/3] md:aspect-[3/2] rounded-2xl overflow-hidden">
          <img src={heroUrl ?? "https://picsum.photos/seed/hero/1200/800"} alt="Hero" className="w-full h-full object-cover" />
        </div>
      </div>
    </section>
  )
}

function PromoTile({
  title,
  body,
  image,
  align = 'left',
  small = false,
}: {
  title: React.ReactNode;
  body: string;
  image: string;
  align?: 'left' | 'right';
  small?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white ${small ? 'grid grid-cols-2' : ''}`}>
      <div className={`p-6 ${align === 'right' ? 'order-2' : ''} ${!small ? 'min-h-44 md:min-h-48' : ''}`}>
        <div className="text-3xl leading-tight">{title}</div>
        <p className="text-sm text-gray-600 mt-2 max-w-sm">{body}</p>
        <Link to="/catalog" className="inline-block mt-4 px-4 py-2 rounded-md border transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer">Shop Now</Link>
      </div>
      <div className={`bg-gray-100 ${small ? '' : 'aspect-video'} ${align === 'right' ? 'order-1' : ''}`}>
        <img src={image} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  )
}
