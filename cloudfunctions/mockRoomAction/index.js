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
    isReady: player && player.isReady === true,
    hasDealt: player && player.hasDealt === true,
    card: player && player.card ? player.card : null
  }))
}

function buildMockPlayers() {
  return [
    {
      openId: 'mock-player-a',
      nickName: '测试玩家A',
      avatarUrl: '',
      isMock: true,
      isReady: false,
      hasDealt: false,
      card: null
    },
    {
      openId: 'mock-player-b',
      nickName: '测试玩家B',
      avatarUrl: '',
      isMock: true,
      isReady: false,
      hasDealt: false,
      card: null
    },
    {
      openId: 'mock-player-c',
      nickName: '测试玩家C',
      avatarUrl: '',
      isMock: true,
      isReady: false,
      hasDealt: false,
      card: null
    },
    {
      openId: 'mock-player-d',
      nickName: '测试玩家D',
      avatarUrl: '',
      isMock: true,
      isReady: false,
      hasDealt: false,
      card: null
    },
    {
      openId: 'mock-player-e',
      nickName: '测试玩家E',
      avatarUrl: '',
      isMock: true,
      isReady: false,
      hasDealt: false,
      card: null
    },
    {
      openId: 'mock-player-f',
      nickName: '测试玩家F',
      avatarUrl: '',
      isMock: true,
      isReady: false,
      hasDealt: false,
      card: null
    },
    {
      openId: 'mock-player-g',
      nickName: '测试玩家G',
      avatarUrl: '',
      isMock: true,
      isReady: false,
      hasDealt: false,
      card: null
    }
  ]
}

function resetPlayerRound(player) {
  return {
    ...player,
    isReady: false,
    hasDealt: false,
    card: null
  }
}

function serializeRoom(room, players, publicCard, status) {
  return {
    roomId: room.roomId,
    ownerOpenId: room.ownerOpenId || '',
    players,
    publicCard: publicCard || null,
    status: status || 'waiting'
  }
}

async function updateRoom(room, data) {
  await rooms.doc(room._id).update({
    data: {
      ...data,
      updatedAt: db.serverDate()
    }
  })
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

    if (action === 'setupMocks') {
      const realPlayers = players.filter((player) => !player.isMock).map(resetPlayerRound)
      const nextPlayers = realPlayers.concat(buildMockPlayers())
      const nextRoom = serializeRoom(room, nextPlayers, null, 'waiting')
      await updateRoom(room, {
        deck: shuffle(createDeck()),
        players: nextPlayers,
        publicCard: null,
        status: 'waiting'
      })
      return { ok: true, room: nextRoom }
    }

    if (action === 'clearMocks') {
      const nextPlayers = players.filter((player) => !player.isMock).map(resetPlayerRound)
      const nextRoom = serializeRoom(room, nextPlayers, null, 'waiting')
      await updateRoom(room, {
        deck: shuffle(createDeck()),
        players: nextPlayers,
        publicCard: null,
        status: 'waiting'
      })
      return { ok: true, room: nextRoom }
    }

    const hasMockPlayers = players.some((player) => player.isMock)
    if (!hasMockPlayers) {
      return { ok: false, code: 'NO_MOCK_PLAYERS', message: '请先添加模拟玩家' }
    }

    if (action === 'mockReadyOthers') {
      const nextPlayers = players.map((player) =>
        player.isMock
          ? {
              ...player,
              isReady: true
            }
          : player
      )
      const nextStatus = nextPlayers.length > 0 && nextPlayers.every((player) => player.isReady) ? 'ready' : 'waiting'
      const nextRoom = serializeRoom(room, nextPlayers, room.publicCard || null, nextStatus)
      await updateRoom(room, {
        players: nextPlayers,
        status: nextStatus
      })
      return { ok: true, room: nextRoom }
    }

    if (action === 'mockDealOthers') {
      if (!(players.length > 0 && players.every((player) => player.isReady))) {
        return { ok: false, code: 'NOT_ALL_READY', message: '请先让所有玩家准备' }
      }

      const deck = Array.isArray(room.deck) ? room.deck.slice() : []
      if (!deck.length) {
        return { ok: false, code: 'DECK_EMPTY', message: '牌已经发完' }
      }

      const nextPlayers = players.map((player) => ({ ...player }))
      nextPlayers.forEach((player) => {
        if (player.isMock && !player.hasDealt && deck.length) {
          player.card = deck.shift()
          player.hasDealt = true
        }
      })

      let publicCard = room.publicCard || null
      const allDealt = nextPlayers.length > 0 && nextPlayers.every((player) => player.hasDealt)
      if (allDealt && !publicCard && deck.length) {
        publicCard = deck.shift()
      }

      const nextStatus = nextPlayers.some((player) => player.hasDealt) ? 'dealing' : room.status || 'waiting'
      const nextRoom = serializeRoom(room, nextPlayers, publicCard, nextStatus)
      await updateRoom(room, {
        deck,
        players: nextPlayers,
        publicCard,
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
