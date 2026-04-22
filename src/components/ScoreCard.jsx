import { useState } from 'react'

function determineWinner(sets, isTiebreak, playerAId, playerBId) {
  let aWins = 0
  let bWins = 0

  for (let i = 0; i < sets.length; i++) {
    const a = parseInt(sets[i].a)
    const b = parseInt(sets[i].b)
    if (isNaN(a) || isNaN(b) || (a === 0 && b === 0)) continue
    // Match tiebreak: whoever has more points wins the set
    if (a > b) aWins++
    else if (b > a) bWins++
  }

  if (aWins >= 2) return playerAId
  if (bWins >= 2) return playerBId
  return null
}

function formatScore(sets, isTiebreak, winnerId, playerAId) {
  const winnerIsA = winnerId === playerAId
  return sets
    .filter((s, i) => s.a !== '' && s.b !== '' && !(s.a === '0' && s.b === '0'))
    .map((s, i) => {
      const isThirdSet = i === 2
      const score = winnerIsA ? `${s.a}-${s.b}` : `${s.b}-${s.a}`
      return isThirdSet && isTiebreak ? `[${score}]` : score
    })
    .join(', ')
}

function setWinner(a, b) {
  const na = parseInt(a), nb = parseInt(b)
  if (isNaN(na) || isNaN(nb) || (na === 0 && nb === 0)) return null
  if (na > nb) return 'a'
  if (nb > na) return 'b'
  return null
}

export default function ScoreCard({ playerA, playerB, playerAId, playerBId, onSubmit, onCancel, loading }) {
  const [sets, setSets] = useState([
    { a: '', b: '' },
    { a: '', b: '' },
    { a: '', b: '' },
  ])
  const [isTiebreak, setIsTiebreak] = useState(false)

  const winnerId = determineWinner(sets, isTiebreak, playerAId, playerBId)
  const winnerName = winnerId === playerAId ? playerA : winnerId === playerBId ? playerB : null

  // Check if set 3 is needed
  let aWins = 0, bWins = 0
  for (let i = 0; i < 2; i++) {
    const w = setWinner(sets[i].a, sets[i].b)
    if (w === 'a') aWins++
    if (w === 'b') bWins++
  }
  const needsSet3 = aWins === 1 && bWins === 1
  const showSet3 = needsSet3 || sets[2].a !== '' || sets[2].b !== ''

  function updateSet(index, player, value) {
    if (value !== '' && (isNaN(value) || parseInt(value) < 0 || parseInt(value) > 99)) return
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [player]: value } : s))
  }

  function handleSubmit() {
    if (!winnerId) return
    onSubmit({
      winnerId,
      loserId: winnerId === playerAId ? playerBId : playerAId,
      score: formatScore(sets, isTiebreak, winnerId, playerAId),
      isTiebreak,
    })
  }

  const canSubmit = winnerId !== null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Submit score</h2>
        <p className="text-sm text-gray-400 mb-5">Best of 3 — enter games won per set</p>

        {/* Header */}
        <div className="grid grid-cols-5 gap-2 mb-2 text-xs font-semibold text-gray-500 text-center">
          <div className="col-span-2 text-left truncate">{playerA}</div>
          <div></div>
          <div className="col-span-2 text-right truncate">{playerB}</div>
        </div>

        {/* Sets */}
        {[0, 1, 2].map(i => {
          if (i === 2 && !showSet3) return null
          const sw = setWinner(sets[i].a, sets[i].b)
          const isMatchTiebreak = i === 2 && isTiebreak
          return (
            <div key={i}>
              <div className="grid grid-cols-5 gap-2 items-center mb-1">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={sets[i].a}
                  onChange={e => updateSet(i, 'a', e.target.value)}
                  placeholder="0"
                  className={`col-span-2 border rounded-lg px-3 py-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    sw === 'a' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300'
                  }`}
                />
                <div className="text-center text-xs text-gray-400 font-medium">
                  {isMatchTiebreak ? 'TB' : `Set ${i + 1}`}
                </div>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={sets[i].b}
                  onChange={e => updateSet(i, 'b', e.target.value)}
                  placeholder="0"
                  className={`col-span-2 border rounded-lg px-3 py-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    sw === 'b' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* Match tiebreak toggle — only on set 3 */}
              {i === 2 && showSet3 && (
                <div className="flex items-center justify-center gap-2 mb-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsTiebreak(t => !t)}
                    className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition ${
                      isTiebreak
                        ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold'
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border flex-shrink-0 ${isTiebreak ? 'bg-amber-400 border-amber-400' : 'border-gray-300'}`} />
                    Match tiebreak (first to 10)
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Winner */}
        <div className={`rounded-xl px-4 py-3 text-sm text-center font-semibold mt-2 mb-5 transition-all ${
          winnerName
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-50 text-gray-400 border border-gray-100'
        }`}>
          {winnerName ? `🏆 ${winnerName} wins` : 'Enter scores to determine winner'}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            style={{ background: canSubmit ? '#15803D' : undefined }}
            className="flex-1 text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:bg-gray-300 transition"
          >
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
