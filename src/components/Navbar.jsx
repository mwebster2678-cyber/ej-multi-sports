import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function MessagesIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function ShieldIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const tabs = [
    { to: '/', label: 'Leagues', Icon: HomeIcon, match: p => p === '/' || p.startsWith('/leagues') },
    ...(user ? [{ to: '/messages', label: 'Messages', Icon: MessagesIcon, match: p => p.startsWith('/messages') }] : []),
    ...(user ? [{ to: '/profile', label: 'Profile', Icon: ProfileIcon, match: p => p === '/profile' }] : []),
    ...(profile?.is_admin ? [{ to: '/admin', label: 'Admin', Icon: ShieldIcon, match: p => p === '/admin' }] : []),
  ]

  return (
    <>
      {/* ── Desktop top nav ── */}
      <nav className="hidden sm:block sticky top-0 z-40" style={{ background: '#0F172A' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
            <span className="text-xl">🎾</span>
            <span>EJ Sports</span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            {tabs.map(({ to, label, match }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  match(path)
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleSignOut}
                className="ml-2 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-medium transition-colors"
              >
                Sign out
              </button>
            ) : (
              <div className="flex items-center gap-1 ml-2">
                <Link to="/login" className="px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 font-medium transition-colors">
                  Sign in
                </Link>
                <Link to="/register" className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar (logo only) ── */}
      <header className="sm:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12" style={{ background: '#0F172A' }}>
        <Link to="/" className="flex items-center gap-1.5 text-white font-bold text-base tracking-tight">
          <span>🎾</span>
          <span>EJ Sports</span>
        </Link>
        {!user && (
          <Link to="/login" className="text-xs font-semibold text-white/70 hover:text-white">
            Sign in
          </Link>
        )}
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {tabs.map(({ to, label, Icon, match }) => {
            const active = match(path)
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                  active ? 'text-green-700' : 'text-gray-400'
                }`}
              >
                <Icon active={active} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            )
          })}
          {!user && (
            <Link
              to="/register"
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-green-700"
            >
              <ProfileIcon active={false} />
              <span className="text-[10px] font-semibold">Join</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
