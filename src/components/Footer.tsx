export default function Footer() {
  const services = [
    'Bonus program',
    'Gift cards',
    'Credit and payment',
    'Service contracts',
    'Non-cash account',
    'Payment',
  ]

  const assistance = [
    'Find an order',
    'Terms of delivery',
    'Exchange and return of goods',
    'Guarantee',
    'Frequently asked questions',
    'Terms of use of the site',
  ]

  return (
    <footer className="bg-black text-white mt-14">
      <div className="container-xl py-14 grid gap-12 md:grid-cols-3">
        {/* Brand and about */}
        <div>
          <div className="text-2xl font-semibold tracking-tight">cyber</div>
          <p className="mt-4 text-sm leading-6 text-gray-400 max-w-sm">
            Bringing the world of entertainment to your home.
          </p>
          <div className="mt-6 flex items-center gap-4 text-gray-300">
            <SocialIcon name="twitter" />
            <SocialIcon name="facebook" />
            <SocialIcon name="tiktok" />
            <SocialIcon name="instagram" />
          </div>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-semibold">Services</h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-300">
            {services.map((s) => (
              <li key={s}><a className="hover:text-white" href="#">{s}</a></li>
            ))}
          </ul>
        </div>

        {/* Assistance */}
        <div>
          <h3 className="font-semibold">Assistance to the buyer</h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-300">
            {assistance.map((s) => (
              <li key={s}><a className="hover:text-white" href="#">{s}</a></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

function SocialIcon({ name }: { name: 'twitter' | 'facebook' | 'tiktok' | 'instagram' }) {
  const common = 'h-5 w-5';
  switch (name) {
    case 'twitter':
      return (
        <a href="#" aria-label="Twitter" className="hover:text-white">
          <svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0012 7.48v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
        </a>
      )
    case 'facebook':
      return (
        <a href="#" aria-label="Facebook" className="hover:text-white">
          <svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.5 9.95v-7.04H7.9V12h2.6V9.8c0-2.56 1.53-3.98 3.86-3.98 1.12 0 2.3.2 2.3.2v2.53h-1.3c-1.28 0-1.67.79-1.67 1.6V12h2.84l-.45 2.91h-2.39v7.04A10 10 0 0022 12z"/></svg>
        </a>
      )
    case 'tiktok':
      return (
        <a href="#" aria-label="TikTok" className="hover:text-white">
          <svg className={common} viewBox="0 0 24 24" fill="currentColor"><path d="M21 8.5a8.5 8.5 0 01-5.2-1.79V16a6 6 0 11-6-6c.26 0 .52.02.78.05V12a3.5 3.5 0 103.5 3.5V2h2.3A6.2 6.2 0 0021 6.9v1.6z"/></svg>
        </a>
      )
    case 'instagram':
    default:
      return (
        <a href="#" aria-label="Instagram" className="hover:text-white">
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg>
        </a>
      )
  }
}
