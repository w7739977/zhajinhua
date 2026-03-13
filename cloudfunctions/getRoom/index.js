const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

exports.main = async (event, context) => {
  try {
    const roomId = String(event.roomId || '').trim()

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
    // 只返回可序列化字段，避免 _id/Date 等导致前端收不到数据
    return {
      ok: true,
      room: {
        roomId: room.roomId,
        players: room.players || [],
        publicCard: room.publicCard || null,
        status: room.status || 'waiting'
      }
    }
  } catch (err) {
    console.error('getRoom error:', err)
    return {
      ok: false,
      code: 'GET_ROOM_FAILED',
      message: err.message || '获取房间失败'
    }
  }
}

