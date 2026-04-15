import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (profile && !profile.is_admin) { navigate('/'); return }
    fetchDisputes()
  }, [user, profile])

  async function fetchDisputes() {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        winner:profiles!matches_winner_id_fkey(full_name, username),
        loser:profiles!matches_loser_id_fkey(full_name, username)
      `)
      .eq('status', 'disputed')
      .order('created_at', { ascending: false })
    setDisputes(data || [])
    setLoading(false)
  }

  async function uphold(match) {
    // Uphold original result — re-confirm the match (re-applies stats via trigger)
    await supabase.from('matches').update({ status: 'confirmed' }).eq('id', match.id)
    setMessage(`Result upheld: ${match.winner.full_name} beat ${match.loser.full_name} ${match.score}`)
    fetchDisputes()
  }

  async function overturn(match) {
    // Overturn — delete the match entirely (stats already reversed by dispute trigger)
    await supabase.from('matches').delete().eq('id', match.id)
    setMessage(`Result overturned and removed.`)
    fetchDisputes()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🛡️</span>
        <h1 className="text-xl font-bold text-gray-900">Admin — Disputed Matches</h1>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-4 flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-600 font-bold ml-4">×</button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-12 text-center text-gray-400 text-sm">
          No disputed matches — all clear.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
          {disputes.map(match => (
            <div key={match.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {match.winner.full_name} <span className="text-gray-400 font-normal">beat</span> {match.loser.full_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Score: {match.score}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Submitted {new Date(match.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-red-500 mt-1 font-medium">⚠ Disputed by {match.loser.full_name}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => uphold(match)}
                  style={{ background: '#15803D' }}
                  className="flex-1 text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
                >
                  Uphold result
                </button>
                <button
                  onClick={() => overturn(match)}
                  className="flex-1 border border-red-300 text-red-600 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition"
                >
                  Overturn result
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
