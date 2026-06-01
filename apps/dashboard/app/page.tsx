const MERCHANTS = [
  { emoji: '📦', name: 'Amazon', desc: 'Returns & refunds' },
  { emoji: '✈️', name: 'Kenya Airways', desc: 'Flight disputes' },
  { emoji: '✈️', name: 'Ethiopian Airlines', desc: 'Flight cancellations' },
  { emoji: '📱', name: 'Safaricom M-PESA', desc: 'Mobile money disputes' },
  { emoji: '🚗', name: 'Uber', desc: 'Trip & fare disputes' },
  { emoji: '🎬', name: 'Netflix', desc: 'Billing issues' },
  { emoji: '🛍️', name: 'Jumia', desc: 'E-commerce disputes' },
  { emoji: '🎓', name: 'Udemy', desc: 'Course refunds' },
  { emoji: '📚', name: 'Coursera', desc: 'Subscription disputes' },
  { emoji: '⚡', name: 'Bolt', desc: 'Ride disputes' },
  { emoji: '🏠', name: 'Airbnb', desc: 'Accommodation disputes' },
  { emoji: '📺', name: 'YouTube Premium', desc: 'Subscription issues' },
];

const TECH_STACK = [
  'Gemini 2.5 Pro',
  'Vertex AI Agent Engine',
  'MongoDB Atlas',
  'Cloud Run',
  'Next.js',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">🧾 Receipts</span>
          <a
            href="/dashboard"
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-700 transition-colors"
          >
            Open Dashboard →
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-[#0f172a] text-white px-6 py-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-sm px-4 py-1.5 rounded-full mb-8 text-slate-300">
            <span className="text-base">✨</span>
            Powered by Gemini AI + Google Cloud
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Get your money back —<br className="hidden sm:block" /> automatically
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Paste any receipt. Our AI agent reads it, finds the relevant consumer law, drafts a
            dispute email, and sends it to the merchant on your behalf.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href="/dashboard"
              className="bg-white text-gray-900 px-7 py-3.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-base"
            >
              Start Disputing →
            </a>
            <a
              href="#how-it-works"
              className="border border-white/40 text-white px-7 py-3.5 rounded-lg font-semibold hover:bg-white/10 transition-colors text-base"
            >
              See how it works ↓
            </a>
          </div>
          <p className="text-sm text-slate-500">
            Covers Amazon, Kenya Airways, Safaricom, Uber, Netflix, Jumia and more
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">How it works</h2>
          <p className="text-center text-gray-500 mb-16 text-lg">Three steps to get your money back</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                emoji: '📋',
                step: 'Step 1',
                title: 'Paste your receipt',
                desc: 'Copy and paste any order confirmation, invoice, or receipt email',
              },
              {
                emoji: '🤖',
                step: 'Step 2',
                title: 'AI drafts your dispute',
                desc: 'Our Gemini-powered agent finds the relevant policy, cites consumer law, and writes a professional dispute letter',
              },
              {
                emoji: '✅',
                step: 'Step 3',
                title: 'Approve and send',
                desc: 'Review the draft, approve it, and we send it directly to the merchant',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="text-center p-8 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="text-5xl mb-5">{item.emoji}</div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  {item.step}
                </p>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE COVER */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Works with the merchants you use every day
          </h2>
          <p className="text-center text-gray-500 mb-14 text-lg">
            20+ merchants covered and growing
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {MERCHANTS.map((m) => (
              <div
                key={m.name}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{m.emoji}</div>
                <div className="font-semibold text-gray-900 text-sm leading-tight">{m.name}</div>
                <div className="text-xs text-gray-400 mt-1">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT ON */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Built on Google Cloud</h2>
          <p className="text-gray-500 mb-12 text-lg">
            Enterprise-grade AI infrastructure powering every dispute
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="border border-gray-200 rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#0f172a] text-white py-28 px-6 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to fight back?</h2>
        <p className="text-slate-300 text-xl mb-12">Your first dispute takes 30 seconds</p>
        <a
          href="/dashboard"
          className="inline-block bg-white text-gray-900 px-10 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Start Disputing →
        </a>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">Receipts © 2026 — Built for the Google Cloud Hackathon</p>
          <a
            href="https://github.com"
            className="text-sm hover:text-white transition-colors"
          >
            GitHub →
          </a>
        </div>
      </footer>
    </div>
  );
}
