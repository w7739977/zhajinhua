const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

// 牌只存字符串，避免云库对嵌套对象字段（rank/face 等）报错
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

async function generateRoomId() {
  for (let tryCount = 0; tryCount < 10; tryCount++) {
    const id = Math.floor(100000 + Math.random() * 900000).toString()
    const existed = await rooms.where({ roomId: id }).count()
    if (existed.total === 0) return id
  }
  throw new Error('生成房间号失败')
}

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID

    const nickName = event.nickName || '玩家'
    const avatarUrl = event.avatarUrl || ''

    const roomId = await generateRoomId()
    const deck = shuffle(createDeck())

    const now = db.serverDate()

    const roomDoc = {
      roomId,
      ownerOpenId: openId,
      status: 'waiting',
      deck,
      publicCard: null,
      players: [
        {
          openId,
          nickName,
          avatarUrl,
          hasDealt: false,
          card: null
        }
      ],
      createdAt: now,
      updatedAt: now
    }

    await rooms.add({
      data: roomDoc
    })

    // 只返回可序列化字段，避免 serverDate 等导致前端收不到数据
    return {
      ok: true,
      roomId,
      openId
    }
  } catch (err) {
    console.error('createRoom error:', err)
    return {
      ok: false,
      code: 'CREATE_FAILED',
      message: err.message || '创建房间失败'
    }
  }
}
