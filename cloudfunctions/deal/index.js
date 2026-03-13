const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

// 牌在数据库中只存字符串（如 "♠K"），避免云库对嵌套对象报错
function cardToText(card) {
  if (card == null) return null
  if (typeof card === 'string') return card
  if (card && typeof card.text === 'string') return card.text
  if (card && (card.face || card.rank)) return `${card.suit || ''}${card.face || card.rank}`
  return null
}
function deckToTextArray(deck) {
  if (!Array.isArray(deck)) return []
  return deck.map((c) => cardToText(c)).filter(Boolean)
}
function playersWithTextCard(players) {
  if (!Array.isArray(players)) return []
  return players.map((p) => {
    if (!p) return p
    const card = p.card
    const text = cardToText(card)
    return { ...p, card: text }
  })
}

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID

    const roomId = String(event.roomId || '').trim()

    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }

    const roomRes = await rooms
    .where({
      roomId
    })
    .limit(1)
    .get()

  if (!roomRes.data.length) {
    return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
  }

  const room = roomRes.data[0]
  const players = room.players || []
  const deck = room.deck || []

  const idx = players.findIndex((p) => p.openId === openId)
  if (idx === -1) {
    return { ok: false, code: 'PLAYER_NOT_IN_ROOM', message: '玩家不在房间内' }
  }

  if (players[idx].hasDealt) {
    return {
      ok: true,
      currentOpenId: openId,
      room: {
        roomId: room.roomId,
        players: room.players,
        publicCard: room.publicCard || null
      }
    }
  }

  if (!deck.length) {
    return { ok: false, code: 'DECK_EMPTY', message: '牌已经发完' }
  }

  const cardRaw = deck.shift()
  const cardText = cardToText(cardRaw)
  players[idx].card = cardText
  players[idx].hasDealt = true

  let publicCardRaw = room.publicCard || null
  const allDealt = players.every((p) => p.hasDealt)
  if (allDealt && !publicCardRaw && deck.length) {
    publicCardRaw = deck.shift()
  }
  const publicCardText = cardToText(publicCardRaw)

  const newRoom = {
    ...room,
    deck,
    players,
    publicCard: publicCardText
  }

  const dataToWrite = {
    deck: deckToTextArray(deck),
    players: playersWithTextCard(players),
    publicCard: publicCardText,
    updatedAt: db.serverDate()
  }
  await rooms.doc(room._id).update({
    data: dataToWrite
  })

    // 只返回可序列化数据，避免 _id/Date 等导致前端收不到；带上当前用户 openId 便于前端识别自己
    return {
      ok: true,
      currentOpenId: openId,
      room: {
        roomId: newRoom.roomId,
        players: newRoom.players,
        publicCard: newRoom.publicCard
      }
    }
  } catch (err) {
    console.error('deal error:', err)
    return {
      ok: false,
      code: 'DEAL_FAILED',
      message: err.message || '发牌失败'
    }
  }
}

