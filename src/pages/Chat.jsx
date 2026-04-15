import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Chat() {
  const { challengeId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchChallenge()
    fetchMessages()

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${challengeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `challenge_id=eq.${challengeId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        scrollToBottom()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [challengeId, user])

  useEffect(() => { scrollToBottom() }, [messages])

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function fetchChallenge() {
    const { data } = await supabase
      .from('challenges')
      .select(`
        id, status, proposed_date,
        challenger:profiles!challenges_challenger_id_fkey(id, full_name, username),
        opponent:profiles!challenges_opponent_id_fkey(id, full_name, username)
      `)
      .eq('id', challengeId)
      .single()
    setChallenge(data)
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    await supabase.from('messages').insert({
      challenge_id: parseInt(challengeId),
      sender_id: user.id,
      content: text.trim(),
    })
    setText('')
    setSending(false)
  }

  function formatTime(ts) {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (!challenge) return <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Loading…</div>

  const other = challenge.challenger.id === user?.id ? challenge.opponent : challenge.challenger

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/messages')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">‹</button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: '#15803D' }}>
          {other.full_name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{other.full_name}</p>
          <p className="text-xs text-gray-400 capitalize">{challenge.status === 'pending' ? 'Challenge sent — awaiting response' : `Challenge ${challenge.status}`}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: '#F9FAFB' }}>
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            Challenge sent to {other.full_name}!<br />
            <span className="text-xs">Send a message to organise your fixture.</span>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 flex-shrink-0">{date}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {msgs.map(msg => {
                const isMe = msg.sender_id === user.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-sm ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-2 rounded-2xl text-sm ${isMe
                        ? 'text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                      }`} style={isMe ? { background: '#15803D' } : {}}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-gray-400 mt-1 px-1">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3 flex-shrink-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          style={{ background: '#15803D' }}
          className="text-white px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition"
        >
          Send
        </button>
      </form>
    </div>
  )
}
