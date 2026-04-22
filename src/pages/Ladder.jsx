import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ScoreCard from '../components/ScoreCard'

export default function Ladder() {
  const { leagueId: leagueIdParam } = useParams()
  const LEAGUE_ID = parseInt(leagueIdParam)
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [league, setLeague] = useState(null)
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
  const [scoreLoading, setScoreLoading] = useState(false)
  const [results, setResults] = useState([])
  const [sortCol, setSortCol] = useState('setsW')
  const [sortDir, setSortDir] = useState('desc')
  const [joinRequest, setJoinRequest] = useState(null) // null | { status }

  useEffect(() => { fetchLadder() }, [user])

  async function fetchLadder() {
    setLoading(true)
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*, sports(name, icon)')
      .eq('id', LEAGUE_ID)
      .single()
    setLeague(leagueData)

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

      if (!mine) {
        const { data: reqData } = await supabase
          .from('league_join_requests')
          .select('status')
          .eq('user_id', user.id)
          .eq('league_id', LEAGUE_ID)
          .maybeSingle()
        setJoinRequest(reqData || null)
      } else {
        setJoinRequest(null)
      }
    }
    const { data: resultData } = await supabase
      .from('matches')
      .select('*, winner:profiles!matches_winner_id_fkey(full_name), loser:profiles!matches_loser_id_fkey(full_name)')
      .eq('league_id', LEAGUE_ID)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
    setResults(resultData || [])

    setLoading(false)
  }

  async function joinLeague() {
    if (!user) { navigate('/register'); return }
    setJoining(true)
    const { error } = await supabase.from('league_join_requests').insert({
      user_id: user.id,
      league_id: LEAGUE_ID,
      status: 'pending',
    })
    if (error) setMessage(error.message)
    else {
      setJoinRequest({ status: 'pending' })
      setMessage('Join request sent — an admin will review it shortly.')
    }
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

  async function submitScore({ winnerId, loserId, score }) {
    if (!scoreTarget) return
    setScoreLoading(true)
    const { challenge, member } = scoreTarget

    const { error } = await supabase.from('matches').insert({
      league_id: LEAGUE_ID,
      challenge_id: challenge.id,
      winner_id: winnerId,
      loser_id: loserId,
      score,
      reported_by: user.id,
      status: 'confirmed',
    })

    if (!error) {
      await supabase.from('challenges').update({ status: 'completed' }).eq('id', challenge.id)
      setScoreTarget(null)
      setMessage(`Score recorded vs ${member.profiles.full_name} — they can dispute if incorrect.`)
      fetchLadder()
    }
    setScoreLoading(false)
  }

  const winRate = (m) => {
    const total = m.wins + m.losses
    return total === 0 ? '—' : `${Math.round((m.wins / total) * 100)}%`
  }

  const setsRate = (m) => {
    const total = (m.sets_won ?? 0) + (m.sets_lost ?? 0)
    return total === 0 ? '—' : `${Math.round(((m.sets_won ?? 0) / total) * 100)}%`
  }

  const gamesRate = (m) => {
    const total = (m.games_won ?? 0) + (m.games_lost ?? 0)
    return total === 0 ? '—' : `${Math.round(((m.games_won ?? 0) / total) * 100)}%`
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'rank' ? 'asc' : 'desc') }
  }

  const colValue = (m, col) => {
    const sw = (m.sets_won ?? 0), sl = (m.sets_lost ?? 0)
    const gw = (m.games_won ?? 0), gl = (m.games_lost ?? 0)
    switch (col) {
      case 'rank':    return m.rank
      case 'wins':    return m.wins
      case 'losses':  return m.losses
      case 'winPct':  return m.wins + m.losses === 0 ? -1 : m.wins / (m.wins + m.losses)
      case 'setsW':   return sw
      case 'setsPct': return sw + sl === 0 ? -1 : sw / (sw + sl)
      case 'gamesW':  return gw
      case 'gamesPct':return gw + gl === 0 ? -1 : gw / (gw + gl)
      default:        return 0
    }
  }

  const sortedMembers = [...members].sort((a, b) => {
    const av = colValue(a, sortCol), bv = colValue(b, sortCol)
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const cols = [
    { col: 'wins',     label: 'W',      title: 'Matches Won',          w: 'w-10' },
    { col: 'losses',   label: 'L',      title: 'Matches Lost',         w: 'w-10' },
    { col: 'winPct',   label: 'Win%',   title: 'Win Percentage',       w: 'w-12' },
    { col: 'gamesW',   label: 'Gms',    title: 'Games Won',            w: 'w-12' },
    { col: 'gamesPct', label: 'Gms%',   title: 'Games Win Percentage', w: 'w-14' },
    { col: 'setsW',    label: 'Sets',   title: 'Sets Won',             w: 'w-12', highlight: true },
    { col: 'setsPct',  label: 'Sets%',  title: 'Set Win Percentage',   w: 'w-14' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, #0F172A 0%, #14532D 100%)' }} className="px-4 pt-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80 mb-5 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            All leagues
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              {league?.sports?.icon || '🎾'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight tracking-tight">{league?.name || 'Tennis Ladder'}</h1>
              <p className="text-white/50 text-sm mt-0.5">{league?.region} · {league?.season} Season</p>
            </div>
          </div>

          {/* My rank pill in hero */}
          {user && myMembership && (
            <div className="mt-5 inline-flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
              <span className="text-white/60 text-xs font-medium">Your rank</span>
              <span className="text-white font-bold text-lg">#{myMembership.rank}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8 pb-8 space-y-4">

        {/* Message */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm flex justify-between items-start">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-green-500 font-bold ml-4 flex-shrink-0">×</button>
          </div>
        )}

        {/* Join banner */}
        {user && !myMembership && (
          joinRequest?.status === 'pending' ? (
            <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-base">⏳</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Request pending</p>
                <p className="text-xs text-gray-400 mt-0.5">An admin will review and add you to the ladder.</p>
              </div>
            </div>
          ) : joinRequest?.status === 'rejected' ? (
            <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-base">✗</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Request declined</p>
                <p className="text-xs text-gray-400 mt-0.5">Contact an admin for more information.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={joinLeague}
              disabled={joining}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #15803D, #16A34A)' }}
            >
              {joining ? 'Sending request…' : 'Request to Join'}
            </button>
          )
        )}

        {!user && (
          <button
            onClick={() => navigate('/register')}
            className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm shadow-sm transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #15803D, #16A34A)' }}
          >
            Create an account to join
          </button>
        )}

        {/* Challenge modal */}
        {challengeTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-0.5">Challenge {challengeTarget.profiles.full_name}</h2>
              <p className="text-sm text-gray-400 mb-5">Currently ranked #{challengeTarget.rank}</p>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Proposed date (optional)</label>
              <input
                type="date"
                value={challengeDate}
                onChange={e => setChallengeDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-5 bg-gray-50"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setChallengeTarget(null); setChallengeDate('') }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={sendChallenge}
                  disabled={challengeLoading}
                  style={{ background: '#15803D' }}
                  className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {challengeLoading ? 'Sending…' : 'Send challenge'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Score submission */}
        {scoreTarget && (
          <ScoreCard
            playerA={profile?.full_name || 'You'}
            playerB={scoreTarget.member.profiles.full_name}
            playerAId={user.id}
            playerBId={scoreTarget.member.user_id}
            onSubmit={submitScore}
            onCancel={() => setScoreTarget(null)}
            loading={scoreLoading}
          />
        )}

        {/* Standings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Standings</h2>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{members.length} players</span>
          </div>

          {loading ? (
            <div className="py-14 text-center text-gray-400 text-sm">Loading…</div>
          ) : members.length === 0 ? (
            <div className="py-14 text-center text-gray-400 text-sm">No players yet — be the first to join!</div>
          ) : (
            <>
              {/* ── Mobile card list ── */}
              <div className="sm:hidden divide-y divide-gray-100">
                {sortedMembers.map(member => {
                  const isMe = member.user_id === user?.id
                  const cw = challengeWith(member)
                  const challengeable = canChallenge(member)
                  return (
                    <div key={member.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-green-50' : ''}`}>
                      <div className="w-8 flex-shrink-0 text-center">
                        {member.rank <= 3 ? (
                          <span className="text-lg">{['🥇','🥈','🥉'][member.rank - 1]}</span>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">#{member.rank}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {member.profiles?.full_name}
                          {isMe && <span className="ml-1.5 text-xs font-normal text-green-600">you</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {member.wins}W · {member.losses}L · <span className="text-yellow-700 font-medium">{member.sets_won ?? 0} sets</span>
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {cw ? (
                          <button
                            onClick={() => setScoreTarget({ challenge: cw, member })}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 active:bg-amber-100 transition"
                          >
                            Score
                          </button>
                        ) : challengeable ? (
                          <button
                            onClick={() => setChallengeTarget(member)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 active:bg-green-100 transition"
                          >
                            Challenge
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Desktop table ── */}
              <div className="hidden sm:block">
                {/* Header */}
                <div className="flex items-center px-4 py-2 bg-slate-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide select-none">
                  <div className="w-8" />
                  <div className="flex-1 pl-3">Player</div>
                  <div className="flex items-center">
                    {cols.map(({ col, label, title, w, highlight }) => (
                      <button
                        key={col}
                        onClick={() => handleSort(col)}
                        title={title}
                        className={`${w} py-2 text-center flex items-center justify-center gap-0.5 transition hover:text-gray-700 ${
                          highlight ? 'text-yellow-700 bg-yellow-50' : sortCol === col ? 'text-green-700' : ''
                        }`}
                      >
                        {label}
                        {sortCol === col && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="w-28" />
                </div>
                {/* Rows */}
                <div className="divide-y divide-gray-100">
                  {sortedMembers.map(member => {
                    const isMe = member.user_id === user?.id
                    const cw = challengeWith(member)
                    const challengeable = canChallenge(member)
                    return (
                      <div
                        key={member.id}
                        className={`flex items-stretch px-4 ${isMe ? 'bg-green-50' : 'hover:bg-slate-50'} transition-colors`}
                      >
                        <div className="w-8 flex items-center justify-center flex-shrink-0">
                          {member.rank <= 3 ? (
                            <span className="text-lg">{['🥇','🥈','🥉'][member.rank - 1]}</span>
                          ) : (
                            <span className="text-xs font-bold text-gray-400">#{member.rank}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-3 pl-3 flex flex-col justify-center">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {member.profiles?.full_name}
                            {isMe && <span className="ml-2 text-xs font-normal text-green-600">you</span>}
                          </p>
                          <p className="text-xs text-gray-400">@{member.profiles?.username}</p>
                        </div>
                        <div className="flex items-stretch text-xs">
                          <span className="w-10 flex items-center justify-center font-semibold text-gray-800">{member.wins}</span>
                          <span className="w-10 flex items-center justify-center font-semibold text-gray-800">{member.losses}</span>
                          <span className="w-12 flex items-center justify-center text-gray-500">{winRate(member)}</span>
                          <span className="w-12 flex items-center justify-center font-semibold text-gray-800">{member.games_won ?? 0}</span>
                          <span className="w-14 flex items-center justify-center text-gray-500">{gamesRate(member)}</span>
                          <span className="w-12 flex items-center justify-center font-bold text-yellow-800 bg-yellow-50">{member.sets_won ?? 0}</span>
                          <span className="w-14 flex items-center justify-center text-yellow-700">{setsRate(member)}</span>
                        </div>
                        <div className="w-28 flex-shrink-0 flex">
                          {cw && (
                            <button
                              onClick={() => setScoreTarget({ challenge: cw, member })}
                              className="flex-1 text-xs font-semibold border-l border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition flex items-center justify-center"
                            >
                              Score
                            </button>
                          )}
                          {challengeable && !cw && (
                            <button
                              onClick={() => setChallengeTarget(member)}
                              className="flex-1 text-xs font-semibold text-white flex items-center justify-center transition hover:opacity-90"
                              style={{ background: '#15803D' }}
                            >
                              Challenge
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Recent Results</h2>
          </div>
          {results.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No results yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map(r => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 truncate">{r.winner.full_name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">def.</span>
                      <span className="text-sm text-gray-500 truncate">{r.loser.full_name}</span>
                    </div>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{r.score}</p>
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0">
                    {new Date(r.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
