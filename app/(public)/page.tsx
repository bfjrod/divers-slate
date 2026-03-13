import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="font-semibold text-gray-900 tracking-tight">Divers Slate</span>
        <Link
          href="/login"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-bold text-gray-900 leading-tight">
          Your dive history,<br />in one place.
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Log every dive you&apos;ve ever taken. Conditions, gear, marine life, photos.
          The slate is what divers write on underwater — this is where it lives permanently.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start your slate →
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            See dives on the map
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          {
            title: 'Log every dive',
            body: 'Depth, bottom time, visibility, gear, conditions, marine life. Everything you\'d write on a slate, now searchable.',
          },
          {
            title: 'Track your history',
            body: 'Total dives, total bottom time, deepest dive, most visited sites. Watch your numbers grow.',
          },
          {
            title: 'Share your profile',
            body: 'Opt in to a public profile. Share your dive count, recent dives, and the sites you\'ve explored.',
          },
        ].map((f) => (
          <div key={f.title} className="border border-gray-100 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
