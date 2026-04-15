import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchChats()
  }, [user])

  async function fetchChats() {
    const { data } = await supabase
      .from('challenges')
      .select(`
        id, status, created_at,
        challenger:profiles!challenges_challenger_id_fkey(id, full_name, username),
        opponent:profiles!challenges_opponent_id_fkey(id, full_name, username)
      `)
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .not('status', 'eq', 'declined')
      .order('created_at', { ascending: false })

    // Fetch last message for each challenge
    const withLastMessage = await Promise.all(
      (data || []).map(async (chat) => {
        const { data: msgs } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('challenge_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
        return { ...chat, lastMessage: msgs?.[0] || null }
      })
    )

    setChats(withLastMessage)
    setLoading(false)
  }

  function otherPlayer(chat) {
    return chat.challenger.id === user.id ? chat.opponent : chat.challenger
  }

  function statusBadge(status) {
    const map = {
      pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
      accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
      completed: { label: 'Completed', color: 'bg-gray-100 text-gray-500' },
      expired: { label: 'Expired', color: 'bg-red-100 text-red-500' },
    }
    const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-500' }
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Messages</h1>

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
      ) : chats.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-12">
          No chats yet — challenge a player from the ladder to get started.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {chats.map(chat => {
            const other = otherPlayer(chat)
            return (
              <button
                key={chat.id}
                onClick={() => navigate(`/messages/${chat.id}`)}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm" style={{ background: '#15803D' }}>
                  {other.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{other.full_name}</p>
                    {statusBadge(chat.status)}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {chat.lastMessage ? chat.lastMessage.content : 'No messages yet — say hello!'}
                  </p>
                </div>
                <span className="text-gray-300 text-lg flex-shrink-0">›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
