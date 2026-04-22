import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const typeLabel = { ladder: 'Ladder', round_robin: 'Round Robin', knockout: 'Knockout' }

export default function Leagues() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leagues, setLeagues] = useState([])
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLeagues() }, [user])

  async function fetchLeagues() {
    setLoading(true)
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*, sports(name, icon)')
      .eq('status', 'active')
      .order('id', { ascending: true })

    setLeagues(leagueData || [])

    if (user) {
      const { data: memberData } = await supabase
        .from('league_members')
        .select('league_id, rank')
        .eq('user_id', user.id)
      setMemberships(memberData || [])
    }
    setLoading(false)
  }

  function getMembership(leagueId) {
    return memberships.find(m => m.league_id === leagueId) || null
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A2F 100%)' }} className="px-4 pt-8 pb-20">
        <div className="max-w-lg mx-auto">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-green-400 mb-3">
            2026 Season
          </span>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
            Find your league
          </h1>
          <p className="text-slate-400 text-sm">London &amp; South East England</p>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-lg mx-auto px-4 -mt-12 pb-8 space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-400 text-sm">
            Loading leagues…
          </div>
        ) : (
          leagues.map(league => {
            const membership = getMembership(league.id)
            return (
              <div
                key={league.id}
                onClick={() => navigate(`/leagues/${league.id}`)}
                className="bg-white rounded-2xl shadow-sm cursor-pointer overflow-hidden"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: '#F0FDF4' }}
                  >
                    {league.sports?.icon || '🏆'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 text-sm leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {league.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">{league.region}</p>
                  </div>

                  {/* Rank or arrow */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {membership ? (
                      <div className="flex flex-col items-center">
                        <p className="text-lg font-bold text-green-700">#{membership.rank}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Rank</p>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {membership && (
                  <div className="h-0.5 mx-4 mb-3 rounded-full" style={{ background: 'linear-gradient(90deg, #15803D, #86EFAC)' }} />
                )}
              </div>
            )
          })
        )}

        {!user && !loading && (
          <div className="mt-2 bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-sm text-gray-500 mb-3">Create an account to join a league and track your progress</p>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: '#15803D' }}
            >
              Get started
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
