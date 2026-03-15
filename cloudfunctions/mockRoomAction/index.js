const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const _ = db.command
const rooms = db.collection('rooms')

function createDeck() {
  const suits = ['♠', '♥', '♣', '♦']
  const faces = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck = []
  suits.forEach((suit) => {
    faces.forEach((face) => {
      deck.push(`${suit}${face}`)
    })
  })
  return deck
}

function shuffle(array) {
  const arr = array.slice()
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function normalizePlayers(players) {
  return (players || []).map((player) => ({
    ...player,
    isMock: player && player.isMock === true,
    hasDealt: player && player.hasDealt === true,
    card: player && player.card ? player.card : null,
    bet: player && player.bet != null ? player.bet : null,
    score: player && player.score != null ? player.score : 0
  }))
}

function buildMockPlayers() {
  const names = ['测试A', '测试B', '测试C', '测试D', '测试E', '测试F', '测试G']
  return names.map((name, i) => ({
    openId: `mock-player-${String.fromCharCode(97 + i)}`,
    nickName: name,
    avatarUrl: '',
    isMock: true,
    hasDealt: false,
    card: null,
    bet: null,
    score: 0
  }))
}

function resetPlayerRound(player) {
  return {
    ...player,
    hasDealt: false,
    card: null,
    bet: null
  }
}

function serializeRoom(room, players, publicCard, status) {
  return {
    roomId: room.roomId,
    ownerOpenId: room.ownerOpenId || '',
    dealerOpenId: room.dealerOpenId || room.ownerOpenId || '',
    players,
    publicCard: publicCard || null,
    status: status || 'waiting'
  }
}

async function updateRoom(room, data) {
  const wrapped = {}
  for (const key of Object.keys(data)) {
    const val = data[key]
    if (Array.isArray(val) || (val !== null && typeof val === 'object') || val === null) {
      wrapped[key] = _.set(val)
    } else {
      wrapped[key] = val
    }
  }
  wrapped.updatedAt = db.serverDate()
  await rooms.doc(room._id).update({ data: wrapped })
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID
    const roomId = String(event.roomId || '').trim()
    const action = String(event.action || '').trim()

    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }
    if (!action) {
      return { ok: false, code: 'ACTION_EMPTY', message: '缺少测试动作' }
    }

    const roomRes = await rooms.where({ roomId }).limit(1).get()
    if (!roomRes.data.length) {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
    }

    const room = roomRes.data[0]
    const players = normalizePlayers(room.players)
    const isOwner = room.ownerOpenId === openId
    const self = players.find((player) => player.openId === openId)

    if (!self) {
      return { ok: false, code: 'PLAYER_NOT_IN_ROOM', message: '玩家不在房间内' }
    }
    if (!isOwner) {
      return { ok: false, code: 'ONLY_OWNER_ALLOWED', message: '仅房主可操作测试面板' }
    }

    // ==================== 添加模拟玩家 ====================
    if (action === 'setupMocks') {
      const realPlayers = players.filter((p) => !p.isMock).map(resetPlayerRound)
      const nextPlayers = realPlayers.concat(buildMockPlayers())
      const nextRoom = serializeRoom(room, nextPlayers, null, 'waiting')
      await updateRoom(room, {
        deck: shuffle(createDeck()),
        players: nextPlayers,
        publicCard: null,
        status: 'waiting',
        roundResult: null
      })
      return { ok: true, room: nextRoom }
    }

    // ==================== 清空模拟玩家 ====================
    if (action === 'clearMocks') {
      const nextPlayers = players.filter((p) => !p.isMock).map(resetPlayerRound)
      const nextRoom = serializeRoom(room, nextPlayers, null, 'waiting')
      await updateRoom(room, {
        deck: shuffle(createDeck()),
        players: nextPlayers,
        publicCard: null,
        status: 'waiting',
        roundResult: null
      })
      return { ok: true, room: nextRoom }
    }

    const hasMockPlayers = players.some((p) => p.isMock)
    if (!hasMockPlayers) {
      return { ok: false, code: 'NO_MOCK_PLAYERS', message: '请先添加模拟玩家' }
    }

    // ==================== 模拟其他人发牌 ====================
    if (action === 'mockDealOthers') {
      const deck = Array.isArray(room.deck) ? room.deck.slice() : []
      if (!deck.length) {
        return { ok: false, code: 'DECK_EMPTY', message: '牌已经发完' }
      }

      const nextPlayers = players.map((p) => ({ ...p }))
      nextPlayers.forEach((p) => {
        if (p.isMock && !p.hasDealt && deck.length) {
          p.card = deck.shift()
          p.hasDealt = true
        }
      })

      let publicCard = room.publicCard || null
      const allDealt = nextPlayers.every((p) => p.hasDealt)
      if (allDealt && !publicCard && deck.length) {
        publicCard = deck.shift()
      }

      const nextStatus = allDealt ? 'betting' : 'dealing'
      const nextRoom = serializeRoom(room, nextPlayers, publicCard, nextStatus)
      await updateRoom(room, {
        deck,
        players: nextPlayers,
        publicCard,
        status: nextStatus
      })
      return { ok: true, room: nextRoom }
    }

    // ==================== 模拟其他人下注 ====================
    if (action === 'mockBetOthers') {
      if (room.status !== 'betting') {
        return { ok: false, code: 'NOT_BETTING', message: '当前不在下注阶段' }
      }

      const dealerOpenId = room.dealerOpenId || room.ownerOpenId
      const nextPlayers = players.map((p) => {
        if (p.isMock && p.bet == null && p.openId !== dealerOpenId) {
          return { ...p, bet: Math.floor(Math.random() * 3) + 1 }
        }
        return { ...p }
      })

      const nonDealer = nextPlayers.filter((p) => p.openId !== dealerOpenId)
      const allBet = nonDealer.every((p) => p.bet != null)
      const nextStatus = allBet ? 'opening' : 'betting'

      const nextRoom = serializeRoom(room, nextPlayers, room.publicCard, nextStatus)
      await updateRoom(room, {
        players: nextPlayers,
        status: nextStatus
      })
      return { ok: true, room: nextRoom }
    }

    return { ok: false, code: 'UNKNOWN_ACTION', message: '未知测试动作' }
  } catch (err) {
    console.error('mockRoomAction error:', err)
    return {
      ok: false,
      code: 'MOCK_ACTION_FAILED',
      message: err.message || '测试操作失败'
    }
  }
}
