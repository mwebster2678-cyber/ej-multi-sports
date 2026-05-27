import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const EMPTY_LEAGUE = { name: '', sport_id: '', type: 'ladder', region: '', season: '', description: '', status: 'launching' }

const STATUS_LABELS = { launching: 'Launching', in_progress: 'In Progress', finished: 'Finished' }
const STATUS_ORDER = ['launching', 'in_progress', 'finished']

export default function Admin() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [disputes, setDisputes] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sports, setSports] = useState([])
  const [newLeague, setNewLeague] = useState(EMPTY_LEAGUE)
  const [creating, setCreating] = useState(false)
  const [allLeagues, setAllLeagues] = useState([])

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (profile && !profile.is_admin) { navigate('/'); return }
    fetchAll()
  }, [user, profile])

  async function fetchAll() {
    setLoading(true)
    const [disputeRes, joinRes, sportsRes, activeLeaguesRes] = await Promise.all([
      supabase
        .from('matches')
        .select(`*, winner:profiles!matches_winner_id_fkey(full_name, username), loser:profiles!matches_loser_id_fkey(full_name, username)`)
        .eq('status', 'disputed')
        .order('created_at', { ascending: false }),
      supabase
        .from('league_join_requests')
        .select(`*, requester:profiles!user_id(full_name, username), leagues(name, region)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase.from('sports').select('*').order('name'),
      supabase.from('leagues').select('*, sports(name, icon)').order('created_at', { ascending: false }),
    ])
    setDisputes(disputeRes.data || [])
    setJoinRequests(joinRes.data || [])
    setSports(sportsRes.data || [])
    setAllLeagues(activeLeaguesRes.data || [])
    setLoading(false)
  }

  async function createLeague(e) {
    e.preventDefault()
    if (!newLeague.name.trim() || !newLeague.sport_id) {
      setMessage('Please fill in a league name and sport.')
      return
    }
    setCreating(true)
    const { error } = await supabase.from('leagues').insert({
      name: newLeague.name.trim(),
      sport_id: parseInt(newLeague.sport_id),
      type: newLeague.type,
      region: newLeague.region.trim() || null,
      season: newLeague.season.trim() || null,
      description: newLeague.description.trim() || null,
      status: newLeague.status,
    })
    setCreating(false)
    if (error) { setMessage(`Error: ${error.message}`); return }
    setMessage(`League "${newLeague.name}" created successfully.`)
    setNewLeague(EMPTY_LEAGUE)
  }

  async function setLeagueStatus(league, status) {
    const { error } = await supabase.from('leagues').update({ status }).eq('id', league.id)
    if (error) { setMessage(`Error: ${error.message}`); return }
    setMessage(`"${league.name}" is now ${STATUS_LABELS[status]}.`)
    fetchAll()
  }

  async function approveJoin(req) {
    // Find next available rank in this league
    const { data: members } = await supabase
      .from('league_members')
      .select('rank')
      .eq('league_id', req.league_id)
      .eq('status', 'active')
      .order('rank', { ascending: false })
      .limit(1)

    const nextRank = members && members.length > 0 ? members[0].rank + 1 : 1

    const { error } = await supabase.from('league_members').insert({
      user_id: req.user_id,
      league_id: req.league_id,
      rank: nextRank,
      wins: 0,
      losses: 0,
      sets_won: 0,
      sets_lost: 0,
      games_won: 0,
      games_lost: 0,
      status: 'active',
    })

    if (error) { setMessage(`Error: ${error.message}`); return }

    await supabase
      .from('league_join_requests')
      .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.id)

    setMessage(`${req.requester.full_name} approved — added at rank #${nextRank} in ${req.leagues.name}.`)
    fetchAll()
  }

  async function rejectJoin(req) {
    await supabase
      .from('league_join_requests')
      .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.id)

    setMessage(`${req.requester.full_name}'s request for ${req.leagues.name} has been declined.`)
    fetchAll()
  }

  async function uphold(match) {
    await supabase.from('matches').update({ status: 'confirmed' }).eq('id', match.id)
    setMessage(`Result upheld: ${match.winner.full_name} beat ${match.loser.full_name} ${match.score}`)
    fetchAll()
  }

  async function overturn(match) {
    const { error } = await supabase.from('matches').delete().eq('id', match.id)
    if (error) { setMessage(`Error: ${error.message}`); return }
    setMessage(`Result overturned — stats and ranks have been reversed.`)
    fetchAll()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🛡️</span>
        <h1 className="text-xl font-bold text-gray-900">Admin</h1>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-600 font-bold ml-4">×</button>
        </div>
      )}

      {/* ── Create League ── */}
      <section>
        <h2 className="font-bold text-gray-900 mb-3">Create League</h2>
        <form onSubmit={createLeague} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">League Name *</label>
              <input
                type="text"
                value={newLeague.name}
                onChange={e => setNewLeague(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. EJ Tennis Ladder Season 2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sport *</label>
              <select
                value={newLeague.sport_id}
                onChange={e => setNewLeague(p => ({ ...p, sport_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Select sport…</option>
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={newLeague.type}
                onChange={e => setNewLeague(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="ladder">Ladder</option>
                <option value="round_robin">Round Robin</option>
                <option value="knockout">Knockout</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
              <input
                type="text"
                value={newLeague.region}
                onChange={e => setNewLeague(p => ({ ...p, region: e.target.value }))}
                placeholder="e.g. South East England"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Season</label>
              <input
                type="text"
                value={newLeague.season}
                onChange={e => setNewLeague(p => ({ ...p, season: e.target.value }))}
                placeholder="e.g. 2026"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={newLeague.status}
                onChange={e => setNewLeague(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="launching">Launching</option>
                <option value="in_progress">In Progress</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={newLeague.description}
                onChange={e => setNewLeague(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description…"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            style={{ background: '#15803D' }}
            className="w-full text-white text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create League'}
          </button>
        </form>
      </section>

      {/* ── Manage Leagues ── */}
      <section>
        <h2 className="font-bold text-gray-900 mb-3">Manage Leagues</h2>
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading…</div>
        ) : allLeagues.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-8 text-center text-gray-400 text-sm">
            No leagues yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            {allLeagues.map(league => (
              <div key={league.id} className="px-4 py-4 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{league.sports?.icon} {league.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{league.region} · {league.season} Season</p>
                </div>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                  {STATUS_ORDER.map(s => (
                    <button
                      key={s}
                      onClick={() => league.status !== s && setLeagueStatus(league, s)}
                      className={`flex-1 py-2 transition ${
                        league.status === s
                          ? s === 'finished'
                            ? 'bg-gray-700 text-white'
                            : s === 'in_progress'
                            ? 'text-white'
                            : 'bg-amber-500 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                      style={league.status === s && s === 'in_progress' ? { background: '#15803D' } : {}}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Join Requests ── */}
      <section>
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          Join Requests
          {joinRequests.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{joinRequests.length}</span>
          )}
        </h2>

        {loading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading…</div>
        ) : joinRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-8 text-center text-gray-400 text-sm">
            No pending join requests.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            {joinRequests.map(req => (
              <div key={req.id} className="px-4 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{req.requester?.full_name}</p>
                  <p className="text-xs text-gray-400">@{req.requester?.username}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{req.leagues?.name} · {req.leagues?.region}</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(req.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveJoin(req)}
                    style={{ background: '#15803D' }}
                    className="text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectJoin(req)}
                    className="text-xs font-semibold px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Disputed Matches ── */}
      <section>
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          Disputed Matches
          {disputes.length > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{disputes.length}</span>
          )}
        </h2>

        {loading ? null : disputes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-8 text-center text-gray-400 text-sm">
            No disputed matches — all clear.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            {disputes.map(match => (
              <div key={match.id} className="px-4 py-4">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {match.winner.full_name} <span className="text-gray-400 font-normal">beat</span> {match.loser.full_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Score: {match.score}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(match.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-red-500 mt-1 font-medium">⚠ Disputed by {match.loser.full_name}</p>
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
      </section>
    </div>
  )
}
