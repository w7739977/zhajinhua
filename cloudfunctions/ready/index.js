const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

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
    const idx = players.findIndex((p) => p.openId === openId)
    if (idx === -1) {
      return { ok: false, code: 'PLAYER_NOT_IN_ROOM', message: '玩家不在房间内' }
    }

    players[idx].isReady = true
    const allReady = players.length > 0 && players.every((p) => p.isReady)
    const status = allReady ? 'ready' : 'waiting'

    await rooms.doc(room._id).update({
      data: {
        players,
        status,
        updatedAt: db.serverDate()
      }
    })

    return {
      ok: true,
      room: {
        roomId: room.roomId,
        players,
        publicCard: room.publicCard || null,
        status
      }
    }
  } catch (err) {
    console.error('ready error:', err)
    return {
      ok: false,
      code: 'READY_FAILED',
      message: err.message || '准备失败'
    }
  }
}
