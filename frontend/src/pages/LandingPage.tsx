import { Link } from 'react-router-dom'

const services = [
  {
    icon: '⚡',
    title: 'Web Applications',
    desc: 'Fast, scalable web apps built with modern frameworks — React on the frontend, FastAPI or Node on the backend.',
  },
  {
    icon: '🤖',
    title: 'AI Integration',
    desc: 'LLM-powered features, RAG pipelines, and intelligent automation built into your existing product.',
  },
  {
    icon: '🎨',
    title: 'UI/UX Design',
    desc: 'Clean, mobile-first interfaces that convert. From wireframes to polished, production-ready designs.',
  },
  {
    icon: '🔗',
    title: 'API & Integrations',
    desc: 'Stripe, Twilio, Notion, Slack — whatever your stack needs connected, built clean and maintainable.',
  },
]

const process = [
  { step: '01', title: 'Discovery', desc: 'We talk through goals, constraints, and what success looks like.' },
  { step: '02', title: 'Proposal', desc: 'Clear scope, timeline, and pricing — no surprises.' },
  { step: '03', title: 'Build', desc: 'Iterative delivery with you in the loop every step of the way.' },
  { step: '04', title: 'Launch', desc: 'Deployment, handoff, and continued support as needed.' },
]

const portfolioItems = [
  {
    title: 'Client Portal Platform',
    tags: ['React', 'FastAPI', 'PostgreSQL'],
    desc: 'A full-stack client portal with project tracking, milestone management, and role-based access.',
  },
  {
    title: 'AI Document Processor',
    tags: ['Python', 'OpenAI', 'FastAPI'],
    desc: 'Automated document ingestion and summarisation pipeline handling 10k+ documents per day.',
  },
  {
    title: 'E-Commerce Dashboard',
    tags: ['React', 'TypeScript', 'Stripe'],
    desc: 'Real-time sales analytics and inventory management for a DTC fashion brand.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-50 to-indigo-50 px-4 py-20 sm:py-28 lg:py-36">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-sm font-semibold text-indigo-600 tracking-widest uppercase mb-4">
            Available for new projects
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            I build software that <span className="text-indigo-600">works for you</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Full-stack developer specialising in web applications, AI integration, and clean product experiences. From MVP to production.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-center"
            >
              Start a project
            </Link>
            <a
              href="#portfolio"
              className="bg-white text-gray-900 px-8 py-3.5 rounded-xl font-semibold border border-gray-200 hover:border-gray-300 transition-colors text-center"
            >
              See my work
            </a>
          </div>
        </div>
      </section>

      {/* What I build */}
      <section id="services" className="px-4 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">What I build</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              End-to-end product work — from initial idea through to deployed, maintained software.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div key={s.title} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{s.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="px-4 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How we work together</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A simple, transparent process with no unnecessary steps.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {process.map((p) => (
              <div key={p.step} className="relative">
                <div className="text-4xl font-black text-indigo-100 mb-2">{p.step}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="portfolio" className="px-4 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Recent projects</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A selection of what I've shipped.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {portfolioItems.map((item) => (
              <div key={item.title} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Portal CTA */}
      <section className="px-4 py-20 bg-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Already a client?</h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Log in to your portal to track project progress, review milestones, and access deliverables.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
            >
              Log in to portal
            </Link>
            <Link
              to="/register"
              className="bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-800 transition-colors border border-indigo-500 text-center"
            >
              Request access
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-4 py-10 text-center text-sm">
        <p>© {new Date().getFullYear()} Mehdi Zebarjadan. All rights reserved.</p>
      </footer>
    </div>
  )
}
