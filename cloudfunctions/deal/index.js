const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const _ = db.command
const rooms = db.collection('rooms')

function cardToText(card) {
  if (card == null) return null
  if (typeof card === 'string') return card
  if (card && typeof card.text === 'string') return card.text
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
    return { ...p, card: cardToText(p.card) }
  })
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID
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
    const deck = room.deck || []
    const idx = players.findIndex((p) => p.openId === openId)

    if (idx === -1) {
      return { ok: false, code: 'PLAYER_NOT_IN_ROOM', message: '玩家不在房间内' }
    }

    if (room.status !== 'waiting' && room.status !== 'dealing') {
      return { ok: false, code: 'WRONG_STATUS', message: '当前不在发牌阶段' }
    }

    if (players[idx].hasDealt) {
      return {
        ok: true,
        currentOpenId: openId,
        room: {
          roomId: room.roomId,
          players: room.players,
          publicCard: room.publicCard || null,
          status: room.status,
          dealerOpenId: room.dealerOpenId
        }
      }
    }

    if (!deck.length) {
      return { ok: false, code: 'DECK_EMPTY', message: '牌已经发完' }
    }

    const cardText = cardToText(deck.shift())
    players[idx].card = cardText
    players[idx].hasDealt = true

    let publicCard = room.publicCard || null
    const allDealt = players.every((p) => p.hasDealt)
    if (allDealt && !publicCard && deck.length) {
      publicCard = cardToText(deck.shift())
    }

    const nextStatus = allDealt ? 'betting' : 'dealing'

    await rooms.doc(room._id).update({
      data: {
        deck: _.set(deckToTextArray(deck)),
        players: _.set(playersWithTextCard(players)),
        publicCard: _.set(publicCard),
        status: nextStatus,
        updatedAt: db.serverDate()
      }
    })

    return {
      ok: true,
      currentOpenId: openId,
      room: {
        roomId: room.roomId,
        players,
        publicCard,
        status: nextStatus,
        dealerOpenId: room.dealerOpenId
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
