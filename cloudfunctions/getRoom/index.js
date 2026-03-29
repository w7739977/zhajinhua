const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-2gytrceb3105a929'
})

const db = cloud.database()
const rooms = db.collection('rooms')

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext()
    const openId = wxContext.OPENID || ''
    const roomId = String(event.roomId || '').trim()

    if (!roomId) {
      return { ok: false, code: 'ROOM_ID_EMPTY', message: '房间号为空' }
    }

    const roomRes = await rooms.where({ roomId }).limit(1).get()
    if (!roomRes.data.length) {
      return { ok: false, code: 'ROOM_NOT_FOUND', message: '房间不存在' }
    }

    const room = roomRes.data[0]
    return {
      ok: true,
      openId,
      room: {
        roomId: room.roomId,
        ownerOpenId: room.ownerOpenId || '',
        dealerOpenId: room.dealerOpenId || room.ownerOpenId || '',
        players: room.players || [],
        publicCard: room.publicCard || null,
        status: room.status || 'waiting',
        roundResult: room.roundResult || null
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
