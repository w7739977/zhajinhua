const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

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
    const allDealt = players.length > 0 && players.every((p) => p.hasDealt)
    if (!allDealt) {
      return { ok: false, code: 'NOT_ALL_DEALT', message: '未全部发牌' }
    }

    await rooms.doc(room._id).update({
      data: {
        status: 'opened',
        updatedAt: db.serverDate()
      }
    })

    return { ok: true }
  } catch (err) {
    console.error('open error:', err)
    return {
      ok: false,
      code: 'OPEN_FAILED',
      message: err.message || '开牌失败'
    }
  }
}
