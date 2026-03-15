const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

function createDeck() {
  const suits = ['♠', '♥', '♣', '♦']
  const faces = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck = []
  suits.forEach((s) => {
    faces.forEach((f) => {
      deck.push(`${s}${f}`)
    })
  })
  return deck
}

function shuffle(array) {
  const arr = array.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getNextDealer(players, currentDealerOpenId) {
  const idx = players.findIndex((p) => p.openId === currentDealerOpenId)
  if (idx === -1) return players[0].openId
  return players[(idx + 1) % players.length].openId
}

exports.main = async (event) => {
  try {
    const roomId = String(event.roomId || '').trim()
    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }

    const roomRes = await rooms.where({ roomId }).limit(1).get()
    if (!roomRes.data.length) {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
    }

    const room = roomRes.data[0]
    const players = room.players || []
    let deck = room.deck || []
    let dealerOpenId = room.dealerOpenId || room.ownerOpenId

    const cardsNeeded = players.length + 1
    let deckRefreshed = false
    let autoPassed = false

    if (deck.length < cardsNeeded) {
      dealerOpenId = getNextDealer(players, dealerOpenId)
      deck = shuffle(createDeck())
      deckRefreshed = true
      autoPassed = true
    }

    const nextPlayers = players.map((p) => ({
      ...p,
      hasDealt: false,
      card: null,
      bet: null
    }))

    await rooms.doc(room._id).update({
      data: {
        deck,
        players: nextPlayers,
        publicCard: null,
        status: 'waiting',
        dealerOpenId,
        roundResult: null,
        updatedAt: db.serverDate()
      }
    })

    return {
      ok: true,
      deckRefreshed,
      autoPassed,
      dealerOpenId,
      room: {
        roomId: room.roomId,
        players: nextPlayers,
        publicCard: null,
        status: 'waiting',
        dealerOpenId
      }
    }
  } catch (err) {
    console.error('resetRound error:', err)
    return {
      ok: false,
      code: 'RESET_FAILED',
      message: err.message || '新一局失败'
    }
  }
}
