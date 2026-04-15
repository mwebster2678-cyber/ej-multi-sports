import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav style={{ background: '#15803D' }} className="text-white px-4 py-3 shadow-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span>🎾</span>
          <span>EJ Sports</span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/" className="opacity-90 hover:opacity-100">Ladder</Link>

          {user ? (
            <>
              <Link to="/messages" className="opacity-90 hover:opacity-100">Messages</Link>
              {profile?.is_admin && (
                <Link to="/admin" className="opacity-90 hover:opacity-100">Admin</Link>
              )}
              <Link to="/profile" className="opacity-90 hover:opacity-100">
                {profile?.username || 'Profile'}
              </Link>
              <button
                onClick={handleSignOut}
                className="bg-white text-green-700 px-3 py-1 rounded-full text-sm font-semibold hover:bg-green-50 transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="opacity-90 hover:opacity-100">Sign in</Link>
              <Link
                to="/register"
                className="bg-white text-green-700 px-3 py-1 rounded-full text-sm font-semibold hover:bg-green-50 transition"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
