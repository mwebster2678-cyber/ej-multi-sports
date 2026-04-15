import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LEAGUE_ID = 1

export default function Ladder() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [myMembership, setMyMembership] = useState(null)
  const [challengeTarget, setChallengeTarget] = useState(null)
  const [challengeDate, setChallengeDate] = useState('')
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [acceptedChallenges, setAcceptedChallenges] = useState([])
  const [scoreTarget, setScoreTarget] = useState(null) // { challenge, member }
  const [score, setScore] = useState('')
  const [scoreLoading, setScoreLoading] = useState(false)

  useEffect(() => { fetchLadder() }, [user])

  async function fetchLadder() {
    setLoading(true)
    const { data } = await supabase
      .from('league_members')
      .select('*, profiles(id, full_name, username)')
      .eq('league_id', LEAGUE_ID)
      .eq('status', 'active')
      .order('rank', { ascending: true })

    setMembers(data || [])

    if (user) {
      const mine = (data || []).find(m => m.user_id === user.id)
      setMyMembership(mine || null)

      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .in('status', ['pending', 'accepted'])
      setAcceptedChallenges(challenges || [])
    }
    setLoading(false)
  }

  async function joinLeague() {
    if (!user) { navigate('/register'); return }
    setJoining(true)
    const nextRank = members.length + 1
    const { error } = await supabase.from('league_members').insert({
      league_id: LEAGUE_ID,
      user_id: user.id,
      rank: nextRank,
      wins: 0,
      losses: 0,
      points: 0,
    })
    if (error) setMessage(error.message)
    else { setMessage('You have joined the ladder!'); fetchLadder() }
    setJoining(false)
  }

  async function sendChallenge() {
    if (!challengeTarget) return
    setChallengeLoading(true)
    const { error } = await supabase.from('challenges').insert({
      league_id: LEAGUE_ID,
      challenger_id: user.id,
      opponent_id: challengeTarget.user_id,
      proposed_date: challengeDate || null,
      status: 'pending',
    })
    if (error) setMessage(error.message)
    else { setMessage(`Challenge sent to ${challengeTarget.profiles.full_name}!`); setChallengeTarget(null) }
    setChallengeLoading(false)
  }

  function canChallenge(member) {
    if (!myMembership) return false
    if (member.user_id === user?.id) return false
    return true
  }

  function challengeWith(member) {
    return acceptedChallenges.find(c =>
      (c.challenger_id === user.id && c.opponent_id === member.user_id) ||
      (c.opponent_id === user.id && c.challenger_id === member.user_id)
    ) || null
  }

  async function submitScore() {
    if (!scoreTarget || !score.trim()) return
    setScoreLoading(true)
    const { challenge, member } = scoreTarget
    const loserId = challenge.challenger_id === user.id ? challenge.opponent_id : challenge.challenger_id

    const { error } = await supabase.from('matches').insert({
      league_id: LEAGUE_ID,
      challenge_id: challenge.id,
      winner_id: user.id,
      loser_id: loserId,
      score: score.trim(),
      reported_by: user.id,
      status: 'confirmed',
    })

    if (!error) {
      await supabase.from('challenges').update({ status: 'completed' }).eq('id', challenge.id)
      setScoreTarget(null)
      setScore('')
      setMessage(`Score recorded vs ${member.profiles.full_name} — they can dispute if incorrect.`)
      fetchLadder()
    }
    setScoreLoading(false)
  }

  const winRate = (m) => {
    const total = m.wins + m.losses
    return total === 0 ? '—' : `${Math.round((m.wins / total) * 100)}%`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="rounded-2xl text-white p-6 mb-6 text-center" style={{ background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)' }}>
        <div className="text-4xl mb-2">🎾</div>
        <h1 className="text-2xl font-bold">EJ Tennis Ladder</h1>
        <p className="text-green-100 text-sm mt-1">South East England · 2026 Season</p>
        <p className="text-green-100 text-sm">Ladder format — challenge players up to 3 places above you</p>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-4 flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-600 font-bold ml-4">×</button>
        </div>
      )}

      {/* Join / My rank */}
      <div className="mb-6">
        {user && myMembership ? (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Your rank</span>
            <span className="text-2xl font-bold text-green-700">#{myMembership.rank}</span>
          </div>
        ) : user ? (
          <button
            onClick={joinLeague}
            disabled={joining}
            style={{ background: '#15803D' }}
            className="w-full text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {joining ? 'Joining…' : 'Join the Ladder'}
          </button>
        ) : (
          <button
            onClick={() => navigate('/register')}
            style={{ background: '#15803D' }}
            className="w-full text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
          >
            Create an account to join
          </button>
        )}
      </div>

      {/* Challenge modal */}
      {challengeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Challenge {challengeTarget.profiles.full_name}</h2>
            <p className="text-sm text-gray-500 mb-4">They are currently ranked #{challengeTarget.rank}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proposed date (optional)</label>
              <input
                type="date"
                value={challengeDate}
                onChange={e => setChallengeDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setChallengeTarget(null); setChallengeDate('') }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendChallenge}
                disabled={challengeLoading}
                style={{ background: '#15803D' }}
                className="flex-1 text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {challengeLoading ? 'Sending…' : 'Send challenge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score submission modal */}
      {scoreTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Submit score</h2>
            <p className="text-sm text-gray-500 mb-4">vs {scoreTarget.member.profiles.full_name} — enter the score with you as the winner</p>
            <input
              value={score}
              onChange={e => setScore(e.target.value)}
              placeholder="e.g. 6-3, 7-5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setScoreTarget(null); setScore('') }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitScore}
                disabled={scoreLoading || !score.trim()}
                style={{ background: '#15803D' }}
                className="flex-1 text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {scoreLoading ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ladder table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Standings</h2>
          <span className="text-sm text-gray-400">{members.length} players</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading ladder…</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No players yet — be the first to join!</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => {
              const isMe = member.user_id === user?.id
              const challengeable = canChallenge(member)
              const accepted = challengeWith(member)
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 px-4 py-3 ${isMe ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {member.rank <= 3 ? (
                      <span className="text-lg">{['🥇','🥈','🥉'][member.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400">#{member.rank}</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {member.profiles?.full_name}
                      {isMe && <span className="ml-2 text-xs text-green-600 font-normal">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400">@{member.profiles?.username}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                    <span><span className="font-semibold text-gray-700">{member.wins}</span>W</span>
                    <span><span className="font-semibold text-gray-700">{member.losses}</span>L</span>
                    <span>{winRate(member)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {challengeWith(member) && (
                      <button
                        onClick={() => setScoreTarget({ challenge: challengeWith(member), member })}
                        className="text-xs font-semibold px-3 py-1 rounded-full border text-amber-600 border-amber-300 hover:bg-amber-50 transition"
                      >
                        Submit score
                      </button>
                    )}
                    {challengeable && !challengeWith(member) && (
                      <button
                        onClick={() => setChallengeTarget(member)}
                        className="text-xs font-semibold px-3 py-1 rounded-full border text-green-700 border-green-300 hover:bg-green-50 transition"
                      >
                        Challenge
                      </button>
                    )}
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
