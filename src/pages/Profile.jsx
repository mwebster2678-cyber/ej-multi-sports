import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [matches, setMatches] = useState([])
  const [challenges, setChallenges] = useState([])
  const [scoreForm, setScoreForm] = useState(null)
  const [score, setScore] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)
    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)

    const [memberRes, matchRes, challengeRes] = await Promise.all([
      supabase.from('league_members')
        .select('*, leagues(name, region)')
        .eq('user_id', user.id),
      supabase.from('matches')
        .select('*, winner:profiles!matches_winner_id_fkey(full_name), loser:profiles!matches_loser_id_fkey(full_name), leagues(name)')
        .or(`winner_id.eq.${user.id},loser_id.eq.${user.id}`)
        .in('status', ['confirmed', 'disputed'])
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('challenges')
        .select('*, league_id, challenger:profiles!challenges_challenger_id_fkey(full_name, username), opponent:profiles!challenges_opponent_id_fkey(full_name, username)')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false }),
    ])

    setMemberships(memberRes.data || [])
    setMatches(matchRes.data || [])
    setChallenges(challengeRes.data || [])
    setLoading(false)
  }

  async function respondToChallenge(challengeId, accept) {
    const { error } = await supabase
      .from('challenges')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', challengeId)
    if (!error) { setMessage(accept ? 'Challenge accepted!' : 'Challenge declined.'); fetchData() }
  }

  async function reportScore(challenge) {
    setScoreForm(challenge)
    setScore('')
  }

  async function submitScore() {
    if (!scoreForm || !score.trim()) return
    const winnerId = user.id
    const loserId = scoreForm.challenger_id === user.id ? scoreForm.opponent_id : scoreForm.challenger_id

    const { error } = await supabase.from('matches').insert({
      league_id: scoreForm.league_id,
      challenge_id: scoreForm.id,
      winner_id: winnerId,
      loser_id: loserId,
      score: score.trim(),
      reported_by: user.id,
      status: 'pending_confirmation',
    })

    if (!error) {
      await supabase.from('challenges').update({ status: 'completed' }).eq('id', scoreForm.id)
      setScoreForm(null)
      setMessage('Score reported — waiting for opponent to confirm.')
      fetchData()
    }
  }

  async function confirmMatch(matchId) {
    const { error } = await supabase.from('matches').update({ status: 'confirmed', confirmed_by: user.id }).eq('id', matchId)
    if (!error) { setMessage('Match confirmed!'); fetchData() }
  }

  async function saveName() {
    if (!editName.trim()) return
    const { error } = await supabase.from('profiles').update({ full_name: editName.trim() }).eq('id', user.id)
    if (!error) {
      setProfile(p => ({ ...p, full_name: editName.trim() }))
      fetchProfile(user.id)
      setEditMode(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-600 font-bold ml-4">×</button>
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: '#15803D' }}>
            {profile?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            {editMode ? (
              <div className="flex gap-2 items-center">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button onClick={saveName} className="text-sm text-green-700 font-semibold hover:underline">Save</button>
                <button onClick={() => setEditMode(false)} className="text-sm text-gray-400 hover:underline">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{profile?.full_name}</h1>
                <button onClick={() => { setEditMode(true); setEditName(profile?.full_name || '') }} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
              </div>
            )}
            <p className="text-sm text-gray-400">@{profile?.username}</p>
          </div>
        </div>

        {/* League memberships */}
        {memberships.length === 0 ? (
          <p className="text-sm text-gray-400 mt-5">Not a member of any leagues yet.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {memberships.map(m => {
              const total = (m.wins || 0) + (m.losses || 0)
              const winPct = total === 0 ? '—' : `${Math.round((m.wins / total) * 100)}%`
              return (
                <div key={m.league_id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{m.leagues?.name} · {m.leagues?.region}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Rank', value: `#${m.rank}` },
                      { label: 'Record', value: `${m.wins}W / ${m.losses}L` },
                      { label: 'Win rate', value: winPct },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-white rounded-lg py-2">
                        <p className="text-base font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active challenges */}
      {challenges.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Active Challenges</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {challenges.map(c => {
              const isChallenging = c.challenger_id === user.id
              const other = isChallenging ? c.opponent : c.challenger
              return (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {isChallenging ? `You challenged ${other?.full_name}` : `${other?.full_name} challenged you`}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{c.status}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!isChallenging && c.status === 'pending' && (
                      <>
                        <button onClick={() => respondToChallenge(c.id, true)} className="text-xs px-3 py-1 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700">Accept</button>
                        <button onClick={() => respondToChallenge(c.id, false)} className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50">Decline</button>
                      </>
                    )}
                    {c.status === 'accepted' && (
                      <button onClick={() => reportScore(c)} className="text-xs px-3 py-1 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-600">Report score</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Score report modal */}
      {scoreForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Report score</h2>
            <p className="text-sm text-gray-500 mb-4">Enter the match score (you as winner)</p>
            <input
              value={score}
              onChange={e => setScore(e.target.value)}
              placeholder="e.g. 6-3, 7-5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setScoreForm(null)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">Cancel</button>
              <button onClick={submitScore} style={{ background: '#15803D' }} className="flex-1 text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Match history */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Match History</h2>
        </div>
        {matches.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No matches played yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {matches.map(m => {
              const won = m.winner_id === user.id
              const canDispute = !won && m.status === 'confirmed'
              return (
                <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      vs {won ? m.loser?.full_name : m.winner?.full_name}
                    </p>
                    <p className="text-xs text-gray-400">{m.score}{m.status === 'disputed' ? ' · Disputed — awaiting admin review' : ''}{m.leagues?.name ? ` · ${m.leagues.name}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canDispute && (
                      <button
                        onClick={async () => {
                          await supabase.from('matches').update({ status: 'disputed' }).eq('id', m.id)
                          setMessage('Match disputed — an admin will review it.')
                          fetchData()
                        }}
                        className="text-xs font-semibold px-3 py-1 rounded-full border border-red-300 text-red-600 hover:bg-red-50 transition"
                      >
                        Dispute
                      </button>
                    )}
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      m.status === 'disputed' ? 'bg-red-100 text-red-500' :
                      won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {m.status === 'disputed' ? 'Disputed' : won ? 'W' : 'L'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
