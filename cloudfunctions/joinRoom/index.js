const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID

    const roomId = String(event.roomId || '').trim()
    const nickName = event.nickName || '玩家'
    const avatarUrl = event.avatarUrl || ''

    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }

    const roomRes = await rooms
      .where({ roomId })
      .limit(1)
      .get()

    if (!roomRes.data.length) {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
    }

    const room = roomRes.data[0]
    const players = room.players || []
    const idx = players.findIndex((p) => p.openId === openId)

    if (idx === -1) {
      players.push({
        openId,
        nickName,
        avatarUrl,
        hasDealt: false,
        card: null
      })
    } else {
      players[idx].nickName = nickName
      players[idx].avatarUrl = avatarUrl
    }

    await rooms.doc(room._id).update({
      data: {
        players,
        updatedAt: db.serverDate()
      }
    })

    // 只返回可序列化字段，避免 _id/Date 等导致前端收不到数据
    return {
      ok: true,
      openId,
      room: {
        roomId: room.roomId,
        players,
        publicCard: room.publicCard || null,
        status: room.status || 'waiting'
      }
    }
  } catch (err) {
    console.error('joinRoom error:', err)
    return {
      ok: false,
      code: 'JOIN_FAILED',
      message: err.message || '加入房间失败'
    }
  }
}

